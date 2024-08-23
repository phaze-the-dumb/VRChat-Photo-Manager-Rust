use serde::ser::{Serialize, SerializeStruct, Serializer};
use serde_json::json;

#[derive(Clone)]
pub struct World {
  id: String,
  name: String,
  author: String,
  author_id: String,
  desc: String,
  img: String,
  max_users: u64,
  visits: u64,
  favourites: u64,
  tags: String,
  from: String,
  from_site: String,
  found: bool,
}

impl World {
  pub fn new(world_id: String) -> World {
    println!("Fetching world data for {}", &world_id);

    let mut world = World {
      id: world_id.clone(),
      name: "".into(),
      author: "".into(),
      author_id: "".into(),
      desc: "".into(),
      img: "".into(),
      max_users: 0,
      visits: 0,
      favourites: 0,
      tags: "".into(),
      from: "https://vrclist.com/worlds/".into(),
      from_site: "vrclist.com".into(),
      found: false,
    };

    let client = reqwest::blocking::Client::new();

    let world_id_str = world_id.to_owned();
    let fixed_id_req = client
      .post("https://api.vrclist.com/worlds/id-convert")
      .header("Content-Type", "application/json")
      .header("User-Agent", "VRChat-Photo-Manager-Rust/0.0.1")
      .body(json!({ "world_id": world_id_str }).to_string())
      .send()
      .unwrap()
      .text()
      .unwrap();

    if &fixed_id_req == "" {
      println!("World {} not found", world_id);
      return world;
    }

    world.found = true;

    let fixed_id: serde_json::Value = serde_json::from_str(&fixed_id_req).unwrap();
    world.from = format!("https://vrclist.com/worlds/{}", fixed_id["id"].to_string());

    let world_data = client
      .post("https://api.vrclist.com/worlds/single")
      .header("Content-Type", "application/json")
      .header("User-Agent", "VRChat-Photo-Manager-Rust/0.0.1")
      .body(json!({ "id": fixed_id["id"].to_string() }).to_string())
      .send()
      .unwrap()
      .text()
      .unwrap();

    let world_data: serde_json::Value = serde_json::from_str(&world_data).unwrap();

    world.name = world_data["name"].to_string();
    world.author = world_data["authorName"].to_string();
    world.author_id = world_data["authorId"].to_string();
    world.desc = world_data["description"].to_string();
    world.img = world_data["imageUrl"].to_string();
    world.tags = world_data["tags"].to_string();

    match world_data["vrchat_visits"].as_u64() {
      Some(visits) => world.visits = visits,
      None => {}
    }

    match world_data["capacity"].as_u64() {
      Some(cap) => {
        world.max_users = cap;
      }
      None => {}
    }

    println!("Fetched world data for {}", &world_id);
    world
  }
}

impl Serialize for World {
  fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
  where
    S: Serializer,
  {
    let mut s = serializer.serialize_struct("World", 7)?;
    s.serialize_field("id", &self.id)?;
    s.serialize_field("name", &self.name)?;
    s.serialize_field("author", &self.author)?;
    s.serialize_field("authorId", &self.author_id)?;
    s.serialize_field("desc", &self.desc)?;
    s.serialize_field("img", &self.img)?;
    s.serialize_field("maxUsers", &self.max_users)?;
    s.serialize_field("visits", &self.visits)?;
    s.serialize_field("favourites", &self.favourites)?;
    s.serialize_field("tags", &self.tags)?;
    s.serialize_field("from", &self.from)?;
    s.serialize_field("fromSite", &self.from_site)?;
    s.serialize_field("found", &self.found)?;

    s.end()
  }
}
