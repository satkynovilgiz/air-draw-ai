# Validation
- Passed: Python compileall; JavaScript node --check.
- Passed: Flask test client serves UI and JavaScript.
- Passed: rejects wrong MIME (415), corrupt JPEG (400), oversized body (413).
- Downloaded official model successfully.
- Real inference attempted, blocked by missing libGLESv2.so.2 in the build environment. No successful inference or hand gesture test is claimed.
- Browser layout, camera permissions, hand tracking, and PNG download were not interactively tested.
- Linux may need system packages libgles2 and libegl1 before inference. macOS uses platform libraries.
- Installed package versions are pinned in requirements.txt. Installation on macOS/Windows was not tested here.
