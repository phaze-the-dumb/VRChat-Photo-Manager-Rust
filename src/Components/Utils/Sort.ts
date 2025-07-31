import { Photo } from "../Structs/Photo";

// https://www.geeksforgeeks.org/typescript/how-to-use-merge-sort-with-typescript/
export let MergeSort = ( array: Photo[] ): Photo[] => {
  if (array.length <= 1) {
    return array;
  }
  const middle = Math.floor(array.length / 2);
  const leftHalf = array.slice(0, middle);
  const rightHalf = array.slice(middle);
  return Merge(MergeSort(leftHalf), MergeSort(rightHalf));
}

let Merge = ( left: Photo[], right: Photo[] ): Photo[] => {
  let result: Photo[] = [];
  let leftIndex = 0;
  let rightIndex = 0;

  while (leftIndex < left.length &&
    rightIndex < right.length) {
    if (left[leftIndex].date > right[rightIndex].date) {
      result.push(left[leftIndex]);
      leftIndex++;
    } else {
      result.push(right[rightIndex]);
      rightIndex++;
    }
  }

  return result.concat(left.slice(leftIndex)).concat(right.slice(rightIndex));
}