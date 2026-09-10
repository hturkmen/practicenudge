# PracticeNudge — üye takibi incelemesi ve geliştirme raporu

İnceleme tarihi: 10 Eylül 2026. Repo: [hturkmen/practicenudge](https://github.com/hturkmen/practicenudge). İncelenen başlangıç: `master`, `6268b56845cbbbaa276f188ff6e9df7c34dc3f2c`.

Adminin üyenin durumunu anlamasını engelleyen temel sorun yalnızca eksik ekran değildi: üye bilgisi sorguları, aktivite kayıtları ve yeni kayıt bildirimi arasında bağlantı eksikleri vardı. Bunlar için uygulama kodu ve `015_member_observability.sql` hazırlandı. Değişiklikler henüz üretime uygulanmadı.

Canlı `/admin` adresi giriş ekranına yönlendi. Kullanıcının isteği üzerine cloud browser incelemesi bırakıldı. Bu rapor kaynak kodu ve yerel testlere dayanır; gerçek üyelerin sayısı, kimlerin aktif olduğu veya hangi hesabın spam olduğu hakkında canlı veriye dayanan bir hüküm içermez.

## Bulgular ve yapılan değişiklikler

| İhtiyaç | Önceki durum | Hazırlanan geliştirme |
|---|---|---|
| Yeni üye gelince e-posta | Bildirim, dashboard tarayıcı kodu firmayı kendisi oluşturduğunda çağrılıyordu. Normal `auth.users` tetikleyicisi firmayı önceden oluşturursa bu dal çalışmıyordu. | Her yeni `firm_users` kaydı aynı veritabanı işleminde kalıcı bildirim kuyruğuna yazılıyor. Webhook hemen gönderimi tetikliyor; dashboard çağrısı ve zamanlanmış görev ek teslim yolları sağlıyor. |
| Ad ve e-posta | Kullanıcı oturumuyla `auth.admin` API çağrılıyordu; bu yetki yeterli değil. Ayrıca `listUsers` yalnızca ilk sayfadan kullanıcı çekiyordu. | Sunucuda önce oturum ve `super_admins` kontrolü yapılıyor. Ardından özel görünüm doğru `auth.users` satırını üyelikle birleştiriyor. |
| Arama ve sayfalama | Arama, sadece getirilen sayfa içinde uygulanıyordu; toplam sonuç sayısı yanlış olabiliyordu. Ad/e-posta sıralaması bu alanların bulunmadığı tabloda yapılıyordu. | Ad, e-posta, firma araması; plan/rol/durum filtreleri ve sıralama aynı veritabanı sorgusunda, sayfalama öncesinde uygulanıyor. |
| Ne zaman üye oldu? | Üyelik satırının tarihi gösteriliyordu. | Hesabın oluşturulması ve firmaya katılma tarihleri ayrı; saat ve UTC bilgisi gösteriliyor. |
| Neler yapıyor? | Admin `member_activity_logs` okuyordu; uygulama esas olarak farklı `activity_logs` tablosuna yazıyordu. | Giriş, müşteri ekleme/güncelleme, talep oluşturma/güncelleme/tamamlama, şablon kaydetme ve firma ayar değişiklikleri veritabanı tetikleyicileriyle kaydediliyor. |
| Kaç müşterisi var? | Üye ekranında firma kullanım özeti yoktu. | Toplam/aktif müşteri, toplam/tamamlanan/geciken talep ve güncel yüklenen dosya sayıları gösteriliyor. Bunlar açıkça **firma toplamı** olarak etiketleniyor. |
| Hangi kaynakları kullanıyor? | Şablon ve iletişim kullanımı tek yerde görünmüyordu. | Kullanılan sistem/firma şablonları ve talep sayıları, özel şablon sayısı, e-posta/SMS kayıtlarının durum dağılımı gösteriliyor. |
| Spam olabilir mi? | İnceleme sinyalleri yoktu. | Geçici e-posta alan adı listesi, 24 saatten uzun doğrulanmamış adres ve firmanın yüksek hacimli bildirim hataları gerekçeleriyle gösteriliyor. Hareketsizlik tek başına spam sinyali değil. |
| E-posta gerçekten gönderildi mi? | Hata bazı akışlarda yutulabiliyor, istemciye yine başarı dönebiliyordu. | Kuyruk durumu, deneme sayısı, sağlayıcının kabul zamanı ve son hata üye detayında gösteriliyor. Resend'in hata döndürmesi de başarısız gönderim sayılıyor. |

## Üye detayında görülecek bilgiler

- Hesap oluşturulma ve firmaya katılma zamanı; rol, plan, aktif/askıya alınmış durum.
- Son giriş, son kaydedilen kişisel işlem, e-posta doğrulaması ve giriş sağlayıcısı.
- Firma müşteri/talep/dosya/şablon toplamları ve bu üyenin bu firmada son 30 günlük kayıtlı işlem sayısı.
- En çok kullanılan 50 şablon; iletişim kanal ve sonuç dağılımları.
- İnceleme gerektiren sinyaller ve her sinyalin gerekçesi.
- Yöneticiye üyelik e-postasının gönderim durumu.
- Bu firmadaki son 100 kişisel işlem; aktörü bilinmeyen son 20 eski firma olayı ayrı tabloda.

Eski firma olaylarından kişisel işlem geçmişi üretilmedi. Yeni kişisel takip güncellemenin uygulanmasından itibaren başlar. Dosya adedi mevcut talep kalemlerindeki ekleri sayar; depolama baytı, bant genişliği, gerçek sağlayıcı maliyeti, sayfa görüntülemeleri ve anonim kaynak indirmelerinin üyeye bağlanması henüz ölçülmüyor. İletişim sayıları uygulama kayıtlarıdır; faturalanan kullanım veya gelen kutusuna teslim garantisi değildir. Eski `reminder_logs` kayıtlarının tümü `notification_logs` içinde bulunmayabilir.

## Bildirim tasarımı

Yeni firma sahibi ve mevcut firmaya eklenen üye için yönetici bildirimi ayrı üyelik kaydından üretilir. Hedef yönetici `SUPER_ADMIN_EMAIL` ayarıdır; mevcut varsayılan `halil.turkmen@gmail.com`. API artık istemciden gelen `email`/`firmName` değerlerini kullanarak keyfî alıcıya e-posta göndermez. Doğrulanmış yeni firma sahibinin karşılama e-postası da kendi kuyruk kaydıyla korunur.

Bir kayıt aynı anda webhook, dashboard ve zamanlayıcı tarafından ele alınsa bile satır kilidiyle tek işlem sahiplenir. Mesaj ilk denemede sabitlenir ve tekrar denemelerde aynı idempotency anahtarı kullanılır. Sağlayıcı kabulü kaydedilemeden bağlantı kesilirse tekrar deneme aynı mesaj üzerinden yapılır. Deneme sayısı 8 ile sınırlıdır. Resend anahtarları 24 saat sakladığından, ilk denemesi 23 saatten eski ve sonucu kesinleşmemiş kayıt otomatik yeniden gönderilmez; `review_required` olur. Bu durumda Resend kaydı incelenmelidir. Kaynaklar: [Resend idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys), [Supabase database webhooks](https://supabase.com/docs/guides/database/webhooks).

Geçmiş üyeler kuyruğa topluca eklenmez; güncelleme nedeniyle eski kayıtlar için e-posta yağmuru oluşmaz.

## Canlıya alma

1. Önce bir test veritabanında, sonra hedef Supabase projesinde `supabase/migrations/015_member_observability.sql` uygulanmalı. Bu adım yeni tablo/görünüm/fonksiyon/tetikleyicileri ekler; geçmiş üyeleri silmez veya askıya almaz. Uygulama yeni görünümü beklediği için migration kod dağıtımından önce gelmeli.
2. Vercel sunucu ortamında mevcut `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `CRON_SECRET` doğrulanmalı; `SUPER_ADMIN_EMAIL` ve yeni, güçlü bir `ADMIN_SIGNUP_WEBHOOK_SECRET` ayarlanmalı. Gizli değerler GitHub'a veya istemci ortamına yazılmamalı. Resend gönderen alan adının doğrulanmış olması gerekir.
3. Güncellenmiş uygulama dağıtılmalı.
4. Supabase Database Webhooks içinde `public.admin_signup_notifications` tablosu için `INSERT` webhook'u tanımlanmalı. Hedef: `https://www.practicenudge.com/api/webhooks/admin-signups`; yöntem: `POST`; header: `Authorization: Bearer <ADMIN_SIGNUP_WEBHOOK_SECRET>`. Supabase'in standart olay gövdesi kullanılır. Her iki bildirim türü aynı üyelik için güvenle işlenebilir.
5. Güvenilir tekrar deneme için `GET https://www.practicenudge.com/api/cron/admin-signups` adresi, `Authorization: Bearer <CRON_SECRET>` ile 5 dakikada bir çağrılmalı. Mevcut Vercel planı bu sıklığı destekliyorsa Vercel Cron, aksi halde mevcut Supabase Cron veya başka yetkili zamanlayıcı kullanılabilir. Repodaki mevcut günlük `/api/cron/reminders` görevi de bir ek kontrol içerir; günlük sıklık tek başına hızlı tekrar deneme sağlamaz.
6. Kontrollü yeni üyelikte admin e-postası, doğrulamadan sonra karşılama e-postası, aynı olayın tekrarında mükerrer gönderim olmaması, admin detayları ve normal kullanıcının admin API'lerine erişememesi canlıda doğrulanmalı.

Bu oturumda production migration, Vercel dağıtımı veya canlı e-posta gönderimi yapılmadı; gerçek çalışma ortamındaki ayarlar doğrulanmadı.

## Doğrulama

- Birim/API testleri: 10 test dosyasında 100 test geçti (`TZ=UTC npm test`).
- TypeScript kontrolü ve Next.js üretim derlemesi başarılı. Önceden mevcut React hook ve görsel optimizasyon uyarıları devam ediyor.
- PostgreSQL davranışı PGlite üzerinde gerçek migration ile test edildi: kayıt tetikleyicisi, eski üyelere bildirim üretmeme, 1.005 müşteri için eksiksiz sayım, giriş ve kullanıcı atfı, talep/şablon/dosya sayımı, kuyruk sahiplenme ve süre aşımı, anon/normal kullanıcı yetkileri, firma silmede zincirleme temizlik.
- Canlı Supabase, Resend teslimi ve tarayıcı testi yapılmadı. Yerel derleme production sırları yerine örnek ortam değerleriyle çalıştırıldı.

Migration kontrolünü tekrarlamak için `@electric-sql/pglite@0.5.8` ayrı bir test araçları klasörüne kurulabilir; `PGLITE_MODULE_PATH` bu paketin `dist/index.js` dosyasına ayarlanarak `node scripts/check-member-observability.mjs` çalıştırılır. Uygulamaya yeni çalışma zamanı bağımlılığı eklenmedi. Mevcut eylem property testlerindeki asenkron çağrıları beklememe hatası derlemeyi engellediği için düzeltildi. Testler UTC ile çalıştırılır: `TZ=UTC npm test`.

## Ayrı ele alınması gereken mevcut güvenlik bulguları

**Yüksek öncelik — müşteri belgelerine erişim:** `001_initial_schema.sql` ve `006_security_fixes.sql` içinde anonim erişim sağlayan politikalar bulunuyor. `magic_token IS NOT NULL` koşulu, isteği yapan kişinin o tokenı bildiğini doğrulamaz. Production politikalarının bu kaynakla aynı olup olmadığı kontrol edilmeli; gerçek token doğrulamasını sunucuda yapan belge erişim akışı ve ona uygun RLS birlikte tasarlanmalı. Bu geniş kapsamlı erişim değişikliği mevcut güncellemede yapılmadı.

**Yüksek öncelik — firmaya katılım:** `006_security_fixes.sql` içindeki üyelik ekleme politikası esas olarak `user_id = auth.uid()` kontrol ediyor; hedef firmaya geçerli davet kontrolü yapmıyor. İmzalı/süreli davet doğrulaması ve rol atama kuralları sunucuda ve veritabanında birlikte uygulanmalı. Production RLS durumu ayrıca doğrulanmalı. Bu risk, bir üyeyi güvenilir kabul etmek için yalnızca firma üyeliğine bakılmaması gerektiğini gösterir.

Spam değerlendirmesi kesin kimlik doğrulaması değildir. İlk sürüm, hesabı otomatik cezalandırmak yerine somut kayıtları incelemeyi mümkün kılar.
