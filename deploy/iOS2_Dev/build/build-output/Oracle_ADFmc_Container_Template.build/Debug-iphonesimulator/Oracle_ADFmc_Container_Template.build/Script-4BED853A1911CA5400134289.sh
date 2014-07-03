#!/bin/sh
if [ "${PLATFORM_NAME}" != "iphonesimulator" ]; then
 if [ "${CONFIGURATION}" = "Debug" ]; then
  find "${PROJECT_DIR}/lib" -type f -name "*.so" | while read file;
    do /usr/bin/codesign --sign "${CODE_SIGN_IDENTITY}" --force --verbose=4 "$file"; done
 fi
fi
