//! Augment list-item wikilinks in hub pages with child post publish dates.
//!
//! Runs after `convert_wikilinks()` in the transform pipeline. For each
//! list-item line containing a resolved wikilink to a post with a `published`
//! field, strips any existing ` @YYYY-MM-DD` annotation and appends a
//! `<time class="hub-child-date">` element with the Korean-formatted date.

/// Parse an ISO date string (`YYYY-MM-DD`) and return `YYYY년 M월 D일`.
///
/// Returns `None` if the input does not match the ISO format or contains
/// non-numeric parts. Month and day are NOT zero-padded in the output.
fn format_date_ko(iso: &str) -> Option<String> {
    let parts: Vec<&str> = iso.split('-').collect();
    if parts.len() != 3 {
        return None;
    }
    let year: u32 = parts[0].parse().ok()?;
    let month: u32 = parts[1].parse().ok()?;
    let day: u32 = parts[2].parse().ok()?;

    if !(1..=12).contains(&month) || !(1..=31).contains(&day) {
        return None;
    }

    Some(format!("{year}년 {month}월 {day}일"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_format_date_ko_basic() {
        assert_eq!(
            format_date_ko("2026-03-16"),
            Some("2026년 3월 16일".to_string())
        );
    }

    #[test]
    fn test_format_date_ko_strips_zero_padding() {
        assert_eq!(
            format_date_ko("2026-03-05"),
            Some("2026년 3월 5일".to_string())
        );
        assert_eq!(
            format_date_ko("2026-01-01"),
            Some("2026년 1월 1일".to_string())
        );
    }

    #[test]
    fn test_format_date_ko_invalid_input() {
        assert_eq!(format_date_ko(""), None);
        assert_eq!(format_date_ko("invalid"), None);
        assert_eq!(format_date_ko("2026-13-01"), None);
        assert_eq!(format_date_ko("2026-03"), None);
        assert_eq!(format_date_ko("2026-03-32"), None);
        assert_eq!(format_date_ko("abcd-ef-gh"), None);
    }
}
