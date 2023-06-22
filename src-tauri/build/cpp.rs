pub struct Builder {
    vendor_dir: std::path::PathBuf,
    paths: Vec<std::path::PathBuf>,
    bins: Vec<Bin>,
    libs: Vec<std::path::PathBuf>,
    out_dir: Option<std::path::PathBuf>,
}

struct Bin {
    path: std::path::PathBuf,
}

impl Builder {
    pub fn new() -> Self {
        let vendor_dir = crate::utils::get_vendor_dir();

        Self {
            vendor_dir,
            paths: Vec::new(),
            bins: Vec::new(),
            libs: Vec::new(),
            out_dir: None,
        }
    }

    pub fn add_vendor(&mut self, name: &str) {
        let path = self.vendor_dir.join(name);

        // check if path exists
        if !path.exists() {
            panic!("vendor directory does not exist");
        }

        // tell cargo to rerun the build script if the vendor directory changes
        println!("cargo:rerun-if-changed={}", path.to_str().unwrap());

        self.paths.push(path);
    }

    pub fn build(&mut self) {
        self.build_cpp_projects();

        // resolve libs
        if self.out_dir.is_some() {
            self.libs = resolve_libs(self.out_dir.clone().unwrap());
        }

        self.copy_files();
    }

    fn build_cpp_projects(&mut self) {
        for path in self.paths.clone() {
            self.bins.push(build_cpp(path.clone()));

            // check if out_dir is set
            if self.out_dir.is_none() {
                // use the parent directory of the first bin
                self.out_dir = Some(
                    self.bins
                        .last()
                        .unwrap()
                        .path
                        .parent()
                        .unwrap()
                        .to_path_buf(),
                );
            }
        }
    }

    fn copy_files(&self) {
        // copy all libs to the target directory
        let target_dir = crate::utils::get_bin_dir();

        for lib in self.libs.clone() {
            let out_path = target_dir.join(lib.file_name().unwrap());

            // copy file only if it doesn't exist
            if !out_path.exists() {
                std::fs::copy(lib, out_path).unwrap();
            }
        }

        // copy all bins to the bin directory
        let bin_dir = crate::utils::get_bin_dir();

        for bin in &self.bins {
            let out_path = bin_dir.join(bin.path.file_name().unwrap());

            // copy file only if bin is newer than the existing one
            if !out_path.exists()
                || out_path.metadata().unwrap().modified().unwrap()
                    < bin.path.metadata().unwrap().modified().unwrap()
            {
                std::fs::copy(&bin.path, out_path).unwrap();
            }
        }
    }
}

fn build_cpp(path: std::path::PathBuf) -> Bin {
    use cmake::Config;

    let path_binding = path.clone();
    let stripped_path = path_binding.to_str().unwrap().replace("\\\\?\\", "");

    let name = path.file_name().unwrap().to_str().unwrap();

    // add extension .exe if on windows
    let name_with_extension = if cfg!(windows) {
        format!("{}.exe", name)
    } else {
        name.to_string()
    };

    let mut bin = Config::new(stripped_path);

    if std::env::var("OPENCV_DIR").is_ok() {
        let value = std::env::var("OPENCV_DIR").unwrap();
        bin.env("OpenCV_DIR", &value);
        bin.define("OpenCV_DIR", value);
    };

    let bin = bin
        .profile("Release")
        .build()
        .join("bin")
        .join(name_with_extension);

    cargo_emit::rustc_link_search!(bin.display() => "native");

    Bin { path: bin }
}

fn resolve_libs(bin: std::path::PathBuf) -> Vec<std::path::PathBuf> {
    let dir = bin.parent().unwrap().join("build");

    // check if there is a Release directory inside the build directory
    let dir = if dir.join("Release").exists() {
        dir.join("Release")
    } else {
        dir
    };

    // scan build directory for libraries (dlls, so, dylib)
    let libs = std::fs::read_dir(dir).unwrap();

    // create a vector of all paths
    let mut paths: Vec<std::path::PathBuf> = Vec::new();

    for lib in libs {
        let lib = lib.unwrap();
        let path = lib.path();

        // check if path is a file
        if path.is_file() {
            // check if file is a library
            if path.extension().unwrap_or_default() == "dll"
                || path.extension().unwrap_or_default() == "so"
                || path.extension().unwrap_or_default() == "dylib"
            {
                paths.push(path.clone());
            }
        }
    }

    paths
}
