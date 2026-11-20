---
tags:
  - test
  - code
created: 2025-05-01
published: 2025-05-12
---

# Post With Code

코드 블록, 넓은 표, 긴 문자열, 수식과 접히는 콜아웃을 한 문서에 모은 fixture 입니다. 앞선 글 [[Simple Post]] 를 참조합니다.

## 코드 블록

```ts
export function greet(name: string): string {
  // 인사말을 만듭니다
  const count = 42;
  return `Hello, ${name}! (${count})`;
}
```

```rust title="src/main.rs"
fn main() {
    let squares: Vec<u32> = (1..=10).filter(|n| n % 2 == 0).map(|n| n * n).collect::<Vec<u32>>();
    println!("{:?}", squares);
}
```

### 긴 문자열

인라인 코드 `obsidian_press::preprocessor::transform::transform_outside_fences_with_a_very_long_identifier_name` 와 주소 https://rvnnt.dev/posts/a-very-long-url-segment-that-keeps-going-without-any-break-opportunity-at-all 는 좁은 화면에서도 줄을 바꿔야 합니다.

## 넓은 표

| 항목 | 첫 번째 열 | 두 번째 열 | 세 번째 열 | 네 번째 열 | 다섯 번째 열 | 여섯 번째 열 | 일곱 번째 열 |
|---|---|---|---|---|---|---|---|
| 페이지 크기 | 4 KiB | 8 KiB | 16 KiB | 32 KiB | 64 KiB | 128 KiB | 256 KiB |
| TLB 항목 | 64 | 128 | 256 | 512 | 1024 | 2048 | 4096 |

## 수식

$$
\sum_{k=1}^{n} \frac{1}{k^2} = 1 + \frac{1}{4} + \frac{1}{9} + \frac{1}{16} + \frac{1}{25} + \frac{1}{36} + \cdots + \frac{1}{n^2} \le \frac{\pi^2}{6}
$$

## 콜아웃

> [!tip]- 접히는 콜아웃
> 펼치면 보이는 본문입니다.

> [!example] 예시
> 예시 콜아웃입니다.
