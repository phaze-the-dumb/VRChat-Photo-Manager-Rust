use std::{ fs, io::{ BufReader, Read }, thread };
use fast_image_resize::{ images::Image, IntoImageView, ResizeOptions, Resizer };
use image::{ codecs::png::{ PngDecoder, PngEncoder }, DynamicImage, ImageEncoder };
use tauri::{ http::{ Request, Response }, UriSchemeResponder };

pub fn handle_uri_proto( request: Request<Vec<u8>>, responder: UriSchemeResponder ){
  thread::spawn(move || {
    // Loads the requested image file, sends data back to the user
    let uri = request.uri();

    if request.method() != "GET" {
      responder.respond(
        Response::builder()
          .status(404)
          .header("Access-Control-Allow-Origin", "*")
          .body(Vec::new())
          .unwrap(),
      );

      return;
    }

    // TODO: Only accept files that are in the vrchat photos folder
    // Slightly more complex than originally thought, need to find a way to cache the VRC photos path
    // since i need to be able to load lots of photos very quickly. This shouldn't be a security issue
    // because tauri should only let the frontend of VRCPhotoManager read files throught this. Only
    // becomes a potential issue if the frontend gets modified or there's an issue with tauri.

    let path = uri.path().split_at(1).1;

    let file = fs::File::open(path);

    match file {
      Ok(mut file) => {
        match uri.query().unwrap(){
          "downscale" => {
            let decoder = PngDecoder::new(BufReader::new(&file)).unwrap();
            let src_image = DynamicImage::from_decoder(decoder).unwrap();

            let size_multiplier: f32 = 200.0 / src_image.height() as f32;

            let dst_width = (src_image.width() as f32 * size_multiplier).floor() as u32;
            let dst_height: u32 = 200;

            let mut dst_image = Image::new(dst_width, dst_height, src_image.pixel_type().unwrap());
            let mut resizer = Resizer::new();

            let opts = ResizeOptions::new()
              .resize_alg(fast_image_resize::ResizeAlg::Nearest);

            resizer.resize(&src_image, &mut dst_image, Some(&opts)).unwrap();

            let mut buf = Vec::new();
            let encoder = PngEncoder::new(&mut buf);

            encoder.write_image(dst_image.buffer(), dst_width, dst_height, src_image.color().into()).unwrap();

            let res = Response::builder()
              .status(200)
              .header("Access-Control-Allow-Origin", "*")
              .body(buf)
              .unwrap();

            responder.respond(res);
          },
          _ => {
            let mut buf = Vec::new();
            file.read_to_end(&mut buf).unwrap();

            let res = Response::builder()
              .status(200)
              .header("Access-Control-Allow-Origin", "*")
              .body(buf)
              .unwrap();

            responder.respond(res);
          }
        }
      }
      Err(_) => {
        responder.respond(
          Response::builder()
            .status(404)
            .header("Access-Control-Allow-Origin", "*")
            .body(b"File Not Found")
            .unwrap(),
        );
      }
    }
  });
}