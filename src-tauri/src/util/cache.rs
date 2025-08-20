use std::{ collections::HashMap, sync::Mutex };

pub struct Cache{
  store: Mutex<HashMap<String, String>>,
}

impl Cache{
  pub fn new() -> Self{
    Cache {
      store: Mutex::new(HashMap::new())
    }
  }

  pub fn insert( &self, key: String, value: String ){
    self.store.lock().unwrap().insert(key, value);
  }

  pub fn get( &self, key: String ) -> Option<String>{
    let store = self.store.lock().unwrap();
    let val = store.get(&key);

    if val.is_none(){
      None
    } else{
      Some(val.unwrap().clone())
    }
  }
}