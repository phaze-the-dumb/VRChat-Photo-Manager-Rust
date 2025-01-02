import { FilterType } from "./Structs/FilterType";

let FilterMenu = () => {
  let selectionButtons: HTMLDivElement[] = [];

  let select = ( index: number ) => {
    selectionButtons.forEach(e => e.classList.remove('selected-filter'));
    selectionButtons[index].classList.add('selected-filter');
  }

  return (
    <>
      <div class="filter-type-select">
        <div class="selected-filter" ref={( el ) => selectionButtons.push(el)} onClick={() => {
          select(0);
          window.PhotoManager.SetFilterType(FilterType.USER);
        }}>User</div>
        <div ref={( el ) => selectionButtons.push(el)} onClick={() => {
          select(1);
          window.PhotoManager.SetFilterType(FilterType.WORLD);
        }}>World</div>
      </div>

      <input class="filter-search" type="text" onInput={( el ) => window.PhotoManager.SetFilter(el.target.value)} placeholder="Enter Search Term..."></input>
    </>
  )
}

export default FilterMenu
export { FilterType }