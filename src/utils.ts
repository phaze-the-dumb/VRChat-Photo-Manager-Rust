let fileSize = [ 'B', 'KB', 'MB', 'GB', 'TB', 'PB' ];

let bytesToFormatted = ( bytes: number, stage: number ): string => {
  if(bytes >= 1000){
    bytes = bytes / 1000;

    if(fileSize[stage + 1])
      return bytesToFormatted(bytes, stage + 1);
    else
      return bytes.toFixed(2) + fileSize[stage];
  } else
    return bytes.toFixed(2) + fileSize[stage];
}

export { bytesToFormatted };