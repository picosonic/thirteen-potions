#!/bin/bash

# Check for work folder specified
if [ $# -ge 1 ]
then
  workdir=$1
  echo "Entering ${workdir}"
  cd "${workdir}"
fi

if [ $# -ge 2 ]
then
  param=$2
else
  param=""
fi

zipfile="js13k.zip"
buildpath="tmpbuild"
jscat="${buildpath}/min.js"
indexcat="${buildpath}/index.html"
assetsrc="tilemap_packed.png"
assetjs="tilemap.js"
leveljs="level.js"

# See if the level asset need to be rebuilt
mapfile="map/thirteen-potions.tmx"
srcdate=`stat -c %Y ${mapfile} 2>/dev/null`
destdate=`stat -c %Y ${leveljs} 2>/dev/null`

# If no js asset found, force build
if [ "${destdate}" == "" ]
then
  destdate=0
fi

# When source is newer, rebuild
if [ ${srcdate} -gt ${destdate} ]
then
  echo -n "Rebuilding levels..."

  # Clear old dest
  echo -n "" > "${leveljs}"

  # Start new file
  echo -n "var level={" > "${leveljs}"

  for attrib in "width" "height"
  do
    echo -n "${attrib}:" >> "${leveljs}"
    cat "${mapfile}" | grep "<map " | tr ' ' '\n' | grep '^'${attrib}'=' | awk -F'"' '{ print $2 }' | tr -d '\n' >> "${leveljs}"
    echo -n ',' >> "${leveljs}"
  done

  for assettype in "Ground" "Walls"
  do
    echo -n "${assettype}:[" | tr 'A-Z' 'a-z' >> "${leveljs}"
    cat "${mapfile}" | tr -d '\n' | sed 's/<layer /\n<layer /g' | grep "${assettype}" | sed 's/</\n</g' | grep "<data " | awk -F'>' '{ print $2 }' | sed 's/,0,/,,/g' | sed 's/,0,/,,/g' | sed 's/^0,/,/g' | sed 's/,0$/,/g' | tr -d '\n' >> "${leveljs}"
    echo -n "]," >> "${leveljs}"
  done

  for assettype in "Things" "Enemies"
  do
    echo -n "${assettype}:[" | tr 'A-Z' 'a-z' >> "${leveljs}"
    cat "${mapfile}" | tr -d '\n' | sed 's/<objectgroup /\n<objectgroup /g' | grep "${assettype}" | sed 's/</\n</g' | grep "<object " | grep "type=" | awk -F'"' '{ print "{id:"$8",x:"$10",y:"$12"}," }' | tr -d '\n' >> "${leveljs}"
    echo -n "]," >> "${leveljs}"
  done

  echo -n "spawn:{" >> "${leveljs}"
  cat "${mapfile}" | tr -d '\n' | sed 's/<objectgroup /\n<objectgroup /g' | grep "Things" | sed 's/</\n</g' | grep "<object " | grep "Spawn" | awk -F'"' '{ print "x:"$6",y:"$8"" }' | tr -d '\n' >> "${leveljs}"
  echo -n "}" >> "${leveljs}"

  echo -n "};" >> "${leveljs}"

  echo "done"
fi

# See if the tilemap asset needs to be rebuilt
srcdate=`stat -c %Y ${assetsrc} 2>/dev/null`
destdate=`stat -c %Y ${assetjs} 2>/dev/null`

# If no js asset found, force build
if [ "${destdate}" == "" ]
then
  destdate=0
fi

# When source is newer, rebuild
if [ ${srcdate} -gt ${destdate} ]
then
  echo -n "Rebuilding tilemap..."

  # Clear old dest
  echo -n "" > "${assetjs}"

  # Convert from src to dest
  echo -n 'const tilemap="data:image/png;base64,' > "${assetjs}"
  base64 -w 0 "${assetsrc}" >> "${assetjs}"
  echo '";' >> "${assetjs}"

  echo "done"
fi

if [ "${param}" == "run" ]
then
  curbrowser=`which xdg-open >/dev/null 2>&1`
  if [ "${curbrowser}" == "" ]
  then
    curbrowser="firefox"
  fi

  ${curbrowser} "index.html" >/dev/null 2>&1
  exit 0
fi

# Create clean build folder
echo "Cleaning build folder"
rm -Rf "${buildpath}" >/dev/null 2>&1
mkdir "${buildpath}"

# Concatenate the JS files
echo "Concatenating JS"
touch "${jscat}" >/dev/null 2>&1
for file in "level.js" "${assetjs}" "${leveljs}" "inputs.js" "main.js"
do
  cat "${file}" >> "${jscat}"
done

# Add the index header
echo -n '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta http-equiv="Content-Type" content="text/html;charset=utf-8"/><title>Thirteen Potions</title><meta name="description" content="Get all the potions as fast as you can!"/><meta property="og:image" content="og.png"/><link rel="icon" href="knight_right.png"/><style>' > "${indexcat}"

# Inject the concatenated and minified CSS files
echo "Minifying CSS"
for file in "main.css"
do
  JAVA_CMD=java yui-compressor "${file}" >> "${indexcat}"
done

# Add on the rest of the index file
echo -n '</style><script type="text/javascript">' >> "${indexcat}"

# Inject the closure-ised and minified JS
./closeyoureyes.sh "${jscat}" | tr -d '\n' >> "${indexcat}"

# Add on the rest of the index file
echo -n '</script><meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/></head><body><div id="game-container"><canvas id="canvas" width="180" height="120"></canvas></div></body></html>' >> "${indexcat}"

# Remove the minified JS
rm "${jscat}" >/dev/null 2>&1

# Remove old zip
rm -Rf "${zipfile}" >/dev/null 2>&1

# Zip everything up
echo "ZIP build folder"
zip -j "${zipfile}" "${buildpath}"/*

# Re-Zip with advzip to save a bit more
echo "Trying to reduce ZIP size"
advzip -i 200 -k -z -4 "${zipfile}"

# Determine file sizes and compression
unzip -lv "${zipfile}"
stat "${zipfile}"

zipsize=`stat -c %s "${zipfile}"`
maxsize=$((13*1024))
bytesleft=$((${maxsize}-${zipsize}))
percent=$((200*${zipsize}/${maxsize} % 2 + 100*${zipsize}/${maxsize}))

if [ ${bytesleft} -ge 0 ]
then
  echo "YAY ${percent}% used - it fits with ${bytesleft} bytes spare"
else
  echo "OH NO ${percent}% used - it's gone ovey by "$((0-${bytesleft}))" bytes"
fi
