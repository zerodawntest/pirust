{ pkgs, ... }:
{
  languages.rust = {
    enable = true;
    channel = "stable";
    version = "1.100.0";
    components = [ "rustc" "cargo" "clippy" "rustfmt" "rust-analyzer" ];
  };

  packages = with pkgs; [ gh jq nodejs gitleaks ];
}
