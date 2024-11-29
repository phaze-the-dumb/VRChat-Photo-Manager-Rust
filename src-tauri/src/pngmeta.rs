use serde::ser::{Serialize, SerializeStruct, Serializer};
use std::str;

#[derive(Clone)]
pub struct PNGImage {
  width: u32,
  height: u32,
  bit_depth: u8,
  colour_type: u8,
  compression_method: u8,
  filter_method: u8,
  interlace_method: u8,
  metadata: String,
  path: String,
}

impl PNGImage {
  pub fn new(buff: Vec<u8>, path: String) -> PNGImage {
    if buff[0] != 0x89
      || buff[1] != 0x50
      || buff[2] != 0x4E
      || buff[3] != 0x47
      || buff[4] != 0x0D
      || buff[5] != 0x0A
      || buff[6] != 0x1A
      || buff[7] != 0x0A
    {
      dbg!(path);
      panic!("Image is not a PNG file");
    }

    let mut img = PNGImage {
      width: 0,
      height: 0,
      bit_depth: 0,
      colour_type: 0,
      compression_method: 0,
      filter_method: 0,
      interlace_method: 0,
      metadata: "".to_string(),
      path: path,
    };

    img.read_png_chunk(8, buff);
    img
  }

  fn read_png_chunk(&mut self, start_byte: usize, buff: Vec<u8>) {
    let data_buff = buff[start_byte..].to_vec();

    let length = u32::from_le_bytes([data_buff[3], data_buff[2], data_buff[1], data_buff[0]]);
    let chunk_type = str::from_utf8(&data_buff[4..8]).unwrap();

    match chunk_type {
      "IHDR" => {
        self.width = u32::from_le_bytes([data_buff[11], data_buff[10], data_buff[9], data_buff[8]]);

        self.height =
          u32::from_le_bytes([data_buff[15], data_buff[14], data_buff[13], data_buff[12]]);

        self.bit_depth = data_buff[16];
        self.colour_type = data_buff[17];
        self.compression_method = data_buff[18];
        self.filter_method = data_buff[19];
        self.interlace_method = data_buff[20];

        self.read_png_chunk((length + 12) as usize, data_buff);
      }
      "iTXt" => {
        let end_byte = (8 + length) as usize;
        let d = str::from_utf8(&data_buff[8..end_byte]).unwrap();

        self.metadata = d.to_string();

        self.read_png_chunk((length + 12) as usize, data_buff);
      }
      "IEND" => {}
      "IDAT" => {}
      _ => {
        self.read_png_chunk((length + 12) as usize, data_buff);
      }
    }
  }
}

impl Serialize for PNGImage {
  fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
  where
    S: Serializer,
  {
    let mut s = serializer.serialize_struct("PNGImage", 7)?;
    s.serialize_field("width", &self.width)?;
    s.serialize_field("height", &self.height)?;
    s.serialize_field("bit_depth", &self.bit_depth)?;
    s.serialize_field("colour_type", &self.colour_type)?;
    s.serialize_field("compression_method", &self.compression_method)?;
    s.serialize_field("filter_method", &self.filter_method)?;
    s.serialize_field("interlace_method", &self.interlace_method)?;
    s.serialize_field("metadata", &self.metadata)?;
    s.serialize_field("path", &self.path)?;
    s.end()
  }
}
