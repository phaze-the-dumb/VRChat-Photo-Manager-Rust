use serde::ser::{Serialize, SerializeStruct, Serializer};

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
  tags: Vec<String>,
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
      tags: vec!["".into()],
      found: false,
    };

    let client = reqwest::blocking::Client::new();

    let world_data = client
      .get(format!("https://api.vrchat.cloud/api/1/worlds/{}", world_id))
      .header("User-Agent", "VRChat-Photo-Manager-Rust/0.0.1")
      .send()
      .unwrap();

    if world_data.status() != 200{ return world; }
    world.found = true;

    let world_data = world_data.text().unwrap();
    let world_data: serde_json::Value = serde_json::from_str(&world_data).unwrap();

    world.name = world_data["name"].as_str().unwrap().to_owned();
    world.author = world_data["authorName"].as_str().unwrap().to_owned();
    world.author_id = world_data["authorId"].as_str().unwrap().to_owned();
    world.desc = world_data["description"].as_str().unwrap().to_owned();
    world.img = world_data["imageUrl"].as_str().unwrap().to_owned();
    world.tags = world_data["tags"].as_array().unwrap().clone().iter()
      .map(| item | item.as_str().unwrap().to_owned())
      .collect();
    world.visits = world_data["visits"].as_u64().unwrap();
    world.favourites = world_data["favorites"].as_u64().unwrap();
    world.max_users = world_data["capacity"].as_u64().unwrap();

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
    s.serialize_field("found", &self.found)?;

    s.end()
  }
}
