use obsidian_press::d2::render_d2;

#[test]
fn test_d2_renders_svg() {
    let source = r#"
direction: right
A -> B: hello
B -> C
"#;
    let svg = render_d2(source, None).unwrap();
    assert!(svg.contains("<svg"));
    assert!(svg.contains("</svg>"));
}

#[test]
fn test_d2_with_korean_text() {
    let source = r#"
클라이언트 -> 서버: 요청
서버 -> 데이터베이스: 쿼리
"#;
    let svg = render_d2(source, None).unwrap();
    assert!(svg.contains("<svg"));
}
