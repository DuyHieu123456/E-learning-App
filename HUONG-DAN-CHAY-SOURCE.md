# Hướng dẫn cài đặt và chạy source — E-Learning App (Nhóm 5)

Mã nguồn: https://github.com/DuyHieu123456/E-learning-App

Ứng dụng học trực tuyến xây dựng bằng React Native + TypeScript (Expo SDK 58), backend Supabase (PostgreSQL, Auth, Storage). Tài liệu này hướng dẫn chạy chương trình theo 2 cách: **trên trình duyệt web** (đơn giản nhất) và **trên điện thoại Android bằng bản development build**.

> **Lưu ý quan trọng:** KHÔNG chạy bản điện thoại bằng Expo Go. Expo Go không sở hữu URL scheme `elearningapp://` của app nên bước đăng nhập Google sẽ treo sau khi chọn tài khoản. Trên điện thoại phải dùng **bản development build** do nhóm đã build sẵn (mục 4). Trên web thì đăng nhập Google hoạt động bình thường.

## 1. Yêu cầu môi trường

- Node.js bản LTS (khuyến nghị 22 trở lên) và npm đi kèm: https://nodejs.org
- Git: https://git-scm.com
- Để chạy trên điện thoại: điện thoại Android, cài sẵn file APK bản development build của nhóm (mục 4); điện thoại và máy tính chạy code phải dùng **chung một mạng Wi-Fi**.
- Một tài khoản Google bất kỳ để đăng nhập trong app (không cần đăng ký riêng — lần đăng nhập đầu tiên tự tạo tài khoản).
- Project Supabase của nhóm đã được khởi tạo sẵn (đã chạy SQL tạo bảng và seed dữ liệu, đã bật đăng nhập Google trong Authentication, có bucket Storage `project-files`). Nếu project bị tạm dừng do lâu không hoạt động (gói miễn phí), mở https://supabase.com/dashboard và chọn project **E-learning App** để kích hoạt lại.

## 2. Lấy source và cài thư viện

```bash
git clone https://github.com/DuyHieu123456/E-learning-App.git
cd E-learning-App
npm install
```

Nếu cài đặt gặp lỗi lạ hoặc vừa pull code mới về, cài lại sạch:

```bash
npm ci
```

## 3. Cấu hình file .env

Tạo file `.env` ở thư mục gốc của project (cùng cấp với `package.json`) với 2 biến của project Supabase:

```
EXPO_PUBLIC_SUPABASE_URL=https://xhfjonkajmnrnskrqceo.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key của project>
```

- Anon key lấy trong Supabase Dashboard → project **E-learning App** → Project Settings → API → khóa `anon` / `public`. File `.env` chứa khóa nên **không commit lên GitHub** (đã nằm trong `.gitignore`).
- Giá trị URL không có hậu tố `/rest/v1/`.
- Nếu không có file `.env`, app vẫn mở được và tự chạy bằng **dữ liệu mẫu cục bộ** trong `src/data` (đủ 11 khóa học để xem giao diện và các luồng chính), nhưng đăng nhập Google và đồng bộ tài khoản sẽ không hoạt động.

## 4. Chạy chương trình

### Cách A — Trên trình duyệt web (đơn giản nhất)

```bash
npx expo start
```

Trong cửa sổ Metro vừa mở, nhấn phím **W** để mở bản web (hoặc chạy thẳng `npx expo start --web`). Trình duyệt mở địa chỉ localhost được hiển thị; đăng nhập Google hoạt động ngay trên web.

### Cách B — Trên điện thoại Android (development build)

1. Cài app vào điện thoại từ bản build của nhóm: mở trang build https://expo.dev/accounts/duy_hieu/projects/Elearning-app/builds/b7b964e7-2cd8-4dea-9b50-df3493d9b065 trên điện thoại → **Install** → tải và cài file APK (nếu máy hỏi quyền, cho phép cài đặt từ trình quản lý file). App cài vào có tên **E-Learning App** (icon xanh ngọc) — đây không phải Expo Go.
2. Trên máy tính, tại thư mục project, chạy:

```bash
npx expo start --dev-client
```

3. Mở app **E-Learning App** trên điện thoại và quét mã QR trong cửa sổ Metro (hoặc chọn kết nối đang hiển thị trong app). Điện thoại và máy tính phải cùng Wi-Fi.
4. App mở cổng đăng nhập: bấm nút Google và chọn tài khoản (màn hình chọn tài khoản luôn hiện), hoặc chọn vào với tư cách khách để xem giao diện (khách chỉ xem, các thao tác như thêm giỏ hàng, học bài sẽ yêu cầu đăng nhập).

### Cách C — Tự build lại bản development build (chỉ khi cần)

```bash
npm install -g eas-cli
eas login
eas build --profile development --platform android
```

Sau khi build xong, cài file APK từ trang build của Expo như Cách B, bước 1.

## 5. Lỗi thường gặp

| Hiện tượng | Nguyên nhân và cách xử lý |
|---|---|
| Thiếu package / lỗi lạ sau khi pull code mới | Chạy `npm ci` để cài lại đúng `package-lock.json`, sau đó khởi động với `npx expo start -c` để xóa cache Metro. Không tự ý nâng cấp phiên bản thư viện trong `package.json`. |
| Lỗi "Native module is null" của AsyncStorage trên điện thoại | Phiên bản AsyncStorage phải đúng bản project đã ghim (2.2.0, khớp Expo SDK 58). Cài lại bằng `npm ci`; không chạy `npm audit fix --force`. |
| Đăng nhập Google trên điện thoại treo sau khi chọn tài khoản | Đang mở app bằng Expo Go. Thoát Expo Go, cài và mở **bản development build** (Cách B) rồi chạy `npx expo start --dev-client`. |
| App mở nhưng không có dữ liệu khóa học | Kiểm tra file `.env`: đúng URL (không thừa `/rest/v1/`), đúng anon key; kiểm tra project Supabase còn hoạt động (mở Dashboard để đánh thức nếu bị tạm dừng). Không có `.env` thì app chỉ có dữ liệu mẫu cục bộ. |
| Điện thoại không kết nối được Metro | Kiểm tra điện thoại và máy tính cùng một mạng Wi-Fi; tắt VPN; thử khởi động lại bằng `npx expo start --dev-client -c`. |
| Đăng nhập xong nhưng dữ liệu cá nhân trống | Mỗi tài khoản Google có dữ liệu riêng (giỏ hàng, khóa đã mua, tiến độ lưu theo tài khoản và đồng bộ qua bảng `user_state`). Hãy chắc chắn đang đăng nhập đúng tài khoản đã dùng trước đó. |

## 6. Cấu trúc thư mục chính

- `src/screens/` — các màn hình, chia theo cụm: `home`, `search`, `course`, `learn`, `mycourses`, `cart`, `profile`, `teacher`, `auth`, `settings`, `onboarding`.
- `src/navigation/` — điều hướng (4 tab chính + stack).
- `src/context/` — quản lý trạng thái toàn app: đăng nhập (Auth), dữ liệu cá nhân (AppState), cài đặt giao diện/ngôn ngữ (Settings), hộp thoại yêu cầu đăng nhập (AuthPrompt).
- `src/services/` — tầng giao tiếp backend: `api.ts` (đọc catalog từ Supabase, tự dự phòng bằng dữ liệu cục bộ khi mất mạng), `auth.ts` (đăng nhập Google), `userState.ts` (đồng bộ dữ liệu cá nhân theo tài khoản), `projectUpload.ts` (tải file project lên Supabase Storage).
- `src/utils/logic.ts` — toàn bộ logic thuần (tiến độ học, giỏ hàng và mã giảm giá, tìm kiếm/lọc/sắp xếp), kiểm thử độc lập được.
- `src/data/` — kiểu dữ liệu dùng chung và dữ liệu mẫu cục bộ (bản dự phòng offline của catalog).
