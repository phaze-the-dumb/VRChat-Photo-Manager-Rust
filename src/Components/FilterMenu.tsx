enum FilterType{
  USER, WORLD
}

class FilterMenuProps{
  setFilterType!: ( type: FilterType ) => void;
  setFilter!: ( filter: string ) => void;
}

let FilterMenu = ( props: FilterMenuProps ) => {
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
          props.setFilterType(FilterType.USER);
        }}>User</div>
        <div ref={( el ) => selectionButtons.push(el)} onClick={() => {
          select(1);
          props.setFilterType(FilterType.WORLD);
        }}>World</div>
      </div>

      <input class="filter-search" type="text" onInput={( el ) => props.setFilter(el.target.value)} placeholder="Enter Search Term..."></input>
    </>
  )
}

export default FilterMenu
export { FilterType }