pub mod aur_helper;
pub mod flatpak;
pub mod manager;
pub mod paru;
pub mod yay;

pub use flatpak::FlatpakManager;
pub use manager::MultiManager;
pub use paru::ParuManager;
pub use yay::YayManager;
