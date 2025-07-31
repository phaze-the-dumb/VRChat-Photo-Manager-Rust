export class WorldCache{
  expiresOn!: number;
  worldData!: {
    id: string,
    name: string,
    author: string,
    authorId: string,
    desc: string,
    img: string,
    maxUsers: number,
    visits: number,
    favourites: number,
    tags: string[],
    from: string,
    fromSite: string,
    found: boolean
  }
}