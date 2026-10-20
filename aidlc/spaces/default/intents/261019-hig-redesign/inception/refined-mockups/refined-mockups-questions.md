# Refined Mockups Questions

These questions settle the visible design choices the requirements leave open (`requirements.md` in the requirements-analysis folder). Fill in each `[Answer]:` with a letter, or with your own words after `X`.

## Question 1: Accent color

Apple interfaces use one tint color for links and controls. Text links must reach 4.5:1 contrast, so each option uses a darker shade for link text in light mode than the bright shade used for controls.

Which accent color should the site use?

A. Apple blue: link text `#0066CC` in light mode and `#2997FF` in dark mode, as on apple.com
B. The current teal, kept as the brand color: link text `#0F766E` in light mode and `#2DD4BF` in dark mode
C. Apple indigo: link text `#4E4CC7` in light mode and `#7D7AFF` in dark mode
X. Other (please specify)

[Answer]: B

## Question 2: Navigation on phones

On wide screens the navigation sits in a floating translucent bar at the top. Phones need a different pattern.

How should navigation work on phones?

A. A compact floating top bar with a menu button that opens a full-height translucent sheet listing the sections, like apple.com
B. A compact top bar plus a floating translucent tab bar at the bottom for the main sections, like iOS apps
C. The same top bar as on wide screens, with the section links scrolling sideways
X. Other (please specify)

[Answer]: A

## Question 3: Post page layout

Post pages show the article plus a table of contents, backlinks, related posts and a local link graph. Today all four sit in a sidebar on screens 960 px and wider.

How should a post page be laid out on wide screens?

A. A reading column with a floating translucent table-of-contents panel beside it; backlinks, related posts and the local graph move below the article
B. Today's arrangement, restyled: a reading column plus a sidebar holding all four
C. Three columns, like Apple's developer documentation: the hub navigation tree on the left, the article in the middle, the table of contents on the right
X. Other (please specify)

[Answer]: A

## Question 4: The appearance control

Readers can pick Automatic, Light or Dark.

What should the control look like?

A. A segmented control (자동 / 라이트 / 다크) in a small translucent popover, opened from an icon in the header
B. One icon button in the header that cycles Automatic, Light, Dark, announcing the current choice
C. A segmented control in the footer only
X. Other (please specify)

[Answer]: B

## Question 5: The homepage

The homepage is built from your vault's homepage note, a profile summary slot, and "오늘 발행된 글" (today's posts).

How should the homepage be laid out?

A. Keep the note-driven page, restyled: a large-title header, the note's sections as grouped cards, and "오늘 발행된 글" as a grouped list
B. A new overview grid above the note's content: featured hubs, recent posts and a profile card
C. Minimal: a large title and the note's content as plain prose
X. Other (please specify)

[Answer]: A

## Question 6: Post lists

Lists of posts appear on hub pages, tag pages and the homepage.

How should they look?

A. Inset grouped lists: rounded groups of rows divided by thin separators, like iOS Settings
B. Separate cards with a subtle shadow
C. Plain rows divided by separators, without grouping
X. Other (please specify)

[Answer]: A

## Question 7: Code blocks

Posts contain many code blocks, highlighted at build time.

How should code blocks look?

A. Xcode-style light and dark syntax colors on a softly tinted rounded panel
B. Today's syntax colors, with only the panel restyled
C. Mostly monochrome code with minimal highlighting
X. Other (please specify)

[Answer]: A
