use obsidian_press::typst_render::render_typst;

fn typst_available() -> bool {
    std::process::Command::new("typst")
        .arg("--version")
        .output()
        .is_ok_and(|o| o.status.success())
}

#[test]
fn test_typst_renders_svg() {
    if !typst_available() {
        eprintln!("skipping: typst CLI not installed");
        return;
    }
    let source = r#"
#set page(width: 200pt, height: 100pt)
#table(
  columns: 3,
  [A], [B], [C],
  [1], [2], [3],
)
"#;
    let svg = render_typst(source).unwrap();
    assert!(svg.contains("<svg"));
}

#[test]
fn test_typst_with_korean() {
    if !typst_available() {
        eprintln!("skipping: typst CLI not installed");
        return;
    }
    let source = r#"
#set page(width: 200pt, height: 80pt)
#set text(font: "Pretendard")
프로세스 상태 전이표
"#;
    let svg = render_typst(source).unwrap();
    assert!(svg.contains("<svg"));
}
