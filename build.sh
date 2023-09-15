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
