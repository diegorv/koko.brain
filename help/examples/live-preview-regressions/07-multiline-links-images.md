# Multi-line links and images

Expect: no crash on opening; wrapped link text is styled; links/images whose hidden part crosses a line show as source.

[wrapped
link text](https://example.com)

[a](
https://example.com/url-on-next-line)

[title on next line](https://example.com "t
x")

[foo][bar
baz]

![image alt](
https://picsum.photos/200)

![ref image][img
ref]

[img ref]: https://picsum.photos/120

![single line image](https://picsum.photos/160)
