import { invoke } from "@tauri-apps/api/core";
import { WorldCache } from "../Structs/WorldCache";
import { listen } from "@tauri-apps/api/event";

export class WorldCacheManager{
  private _worldCache: WorldCache[] = [];
  private _resolveWorld: ( world: WorldCache | null ) => void = () => {};

  constructor(){
    invoke('get_config_value_string', { key: 'worldcache' })
      .then((data: any) => {
        if(data)this._worldCache = JSON.parse(data);
      })

    listen('world_data', ( event: any ) => {
      let worldData = {
        expiresOn: Date.now() + 1.2096E+09,
        worldData: {
          id: event.payload.id,
          name: event.payload.name.split('\\').join('').slice(1, -1),
          author: event.payload.author.split('\\').join('').slice(1, -1),
          authorId: event.payload.authorId.split('\\').join('').slice(1, -1),
          desc: event.payload.desc.split('\\').join('').slice(1, -1),
          img: event.payload.img.split('\\').join('').slice(1, -1),
          maxUsers: event.payload.maxUsers,
          visits: event.payload.visits,
          favourites: event.payload.favourites,
          tags: event.payload.tags,
          from: event.payload.from,
          fromSite: event.payload.fromSite,
          found: event.payload.found
        }
      }
  
      this._worldCache.push(worldData);
      invoke('set_config_value_string', { key: 'worldcache', value: JSON.stringify(this._worldCache) });
  
      this._resolveWorld(worldData);
    })
  }

  getWorldById( id: string ): Promise<WorldCache | null>{
    let promise = new Promise<WorldCache | null>(( res ) => { this._resolveWorld = res });
    let worldData = this._worldCache.find(x => x.worldData.id === id);

    if(!worldData){
      console.log('Fetching new world data');

      invoke('find_world_by_id', { worldId: id });
    } else if(worldData.expiresOn < Date.now()){
      console.log('Fetching new world data since cache has expired');
      
      this._worldCache = this._worldCache.filter(x => x.worldData.id !== id);
      invoke('find_world_by_id', { worldId: id });
    } else{
      this._resolveWorld(worldData);
    }

    return promise;
  }
}