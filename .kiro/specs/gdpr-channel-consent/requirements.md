# Requirements Document

## Introduction

Bu özellik, mevcut GDPR onay sistemini tek bir boolean değerden kanal bazlı (email/sms) ayrı onay yapısına dönüştürür. Her iletişim kanalı için bağımsız onay durumu (pending/accepted/rejected) takip edilir. Client'lar consent sayfasında her kanalı ayrı ayrı kabul veya reddetme imkanına sahip olur. Mevcut `gdpr_consent` boolean alanı kaldırılarak yerine `client_consents` tablosu kullanılır.

## Glossary

- **Consent_Service**: GDPR onay işlemlerini yöneten backend servisi
- **Consent_Page**: Client'ın kanal bazlı onay/red kararlarını verdiği public sayfa
- **Channel**: İletişim kanalı (email veya sms)
- **Consent_Status**: Bir kanalın onay durumu (pending, accepted, rejected)
- **Consent_Token**: Client'a özel, benzersiz onay bağlantısı oluşturmak için kullanılan UUID
- **Client**: Muhasebe firmasının müşterisi olan kişi
- **Firm**: PracticeNudge kullanan muhasebe firması
- **Notification_Service**: Hatırlatma ve bildirim gönderen servis

## Requirements

### Gereksinim 1: Kanal Bazlı Onay Veri Modeli

**Kullanıcı Hikayesi:** Bir firma yöneticisi olarak, her client için kanal bazlı ayrı onay durumlarını takip etmek istiyorum, böylece sadece onay verilen kanallardan iletişim kurabilirim.

#### Kabul Kriterleri

1. THE Consent_Service SHALL her client için her Channel (email, sms) bazında ayrı bir Consent_Status kaydı tutmalı ve bir client ile kanal kombinasyonu benzersiz (unique) olmalıdır
2. THE Consent_Service SHALL Consent_Status değerini pending, accepted veya rejected olarak saklamalıdır
3. WHEN bir client sisteme eklendiğinde, THE Consent_Service SHALL ilgili client için email ve sms kanallarının her birini pending durumunda oluşturmalıdır
4. THE Consent_Service SHALL her onay kaydı için kanal adı, durum, oluşturulma tarihi, güncelleme tarihi ve client bazında tek bir Consent_Token (UUID) bilgisini saklamalıdır
5. WHEN migrasyon çalıştırıldığında, THE Consent_Service SHALL mevcut gdpr_consent değeri true olan client'lar için tüm kanalları accepted, false olan client'lar için tüm kanalları pending durumunda oluşturmalıdır
6. IF bir client için zaten mevcut olan bir kanal kaydı tekrar oluşturulmaya çalışılırsa, THEN THE Consent_Service SHALL mükerrer kayıt oluşturmayı engellemeli ve mevcut kaydı değiştirmeden korumalıdır

### Gereksinim 2: Consent Sayfası Kanal Bazlı Onay/Red

**Kullanıcı Hikayesi:** Bir client olarak, her iletişim kanalını ayrı ayrı kabul veya reddetmek istiyorum, böylece sadece tercih ettiğim kanallardan iletişim alabilirim.

#### Kabul Kriterleri

1. WHEN bir client consent sayfasını açtığında, THE Consent_Page SHALL tüm kanalları (email, sms) ve her kanalın mevcut Consent_Status değerini (pending, accepted veya rejected) listeleyerek göstermelidir
2. THE Consent_Page SHALL her kanal için ayrı kabul ve red butonları sunmalıdır
3. WHEN client bir kanalı kabul ettiğinde, THE Consent_Service SHALL ilgili kanalın durumunu accepted olarak güncellemeli ve güncelleme tarihini kaydetmelidir
4. WHEN client bir kanalı reddettiğinde (mevcut durumu pending veya accepted fark etmeksizin), THE Consent_Service SHALL ilgili kanalın durumunu rejected olarak güncellemeli ve güncelleme tarihini kaydetmelidir
5. WHEN bir kanal durumu başarıyla güncellendiğinde, THE Consent_Page SHALL güncellenen kanalın yeni durumunu 2 saniye içinde ekranda yansıtmalıdır
6. IF kanal durumu güncellenirken bir hata oluşursa, THEN THE Consent_Page SHALL işlemin başarısız olduğunu belirten bir hata mesajı göstermeli ve kanalın mevcut durumunu değiştirmemelidir
7. THE Consent_Page SHALL client adını ve firma adını göstermelidir
8. THE Consent_Page SHALL her kanalın ne amaçla kullanıldığını açıklayan bilgi metni göstermelidir; bu metin kanalın iletişim türünü (hatırlatma, belge talebi vb.) ve geri çekme hakkını içermelidir
9. IF client'ın ilgili kanal için iletişim bilgisi (email adresi veya telefon numarası) sistemde kayıtlı değilse, THEN THE Consent_Page SHALL ilgili kanalı devre dışı olarak göstermeli ve kabul butonunu tıklanamaz yapmalıdır

### Gereksinim 3: Consent E-postası Gönderimi

**Kullanıcı Hikayesi:** Bir firma yöneticisi olarak, client'lara kanal bazlı onay isteği e-postası göndermek istiyorum, böylece client'lar tercihlerini belirleyebilir.

#### Kabul Kriterleri

1. WHEN firma bir client için consent e-postası gönderdiğinde, THE Consent_Service SHALL client'ın kayıtlı email adresine, consent sayfasına yönlendiren consent token bazlı benzersiz bir bağlantı içeren e-posta göndermelidir
2. THE Consent_Service SHALL consent e-postasında firma adını, client adını ve onay bağlantısını içermelidir
3. WHEN client sisteme eklendiğinde ve email adresi mevcutsa, THE Consent_Service SHALL 30 saniye içinde otomatik olarak consent e-postası göndermelidir
4. IF consent token geçersiz veya bulunamazsa, THEN THE Consent_Page SHALL bağlantının geçersiz veya süresi dolmuş olduğunu belirten bir hata mesajı göstermeli ve consent form alanlarını gizlemelidir
5. IF firma bir client için consent e-postası göndermeyi talep ettiğinde client'ın email adresi kayıtlı değilse, THEN THE Consent_Service SHALL e-posta göndermemeli ve email adresi eksik olduğunu belirten bir hata mesajı döndürmelidir
6. IF consent e-postası gönderimi başarısız olursa, THEN THE Consent_Service SHALL firma yöneticisine gönderim başarısızlığını belirten bir hata mesajı göstermelidir
7. WHEN firma aynı client için tekrar consent e-postası gönderdiğinde, THE Consent_Service SHALL mevcut consent token'ı kullanarak yeni bir e-posta göndermelidir

### Gereksinim 4: Kanal Bazlı Bildirim Kontrolü

**Kullanıcı Hikayesi:** Bir firma yöneticisi olarak, sadece onay verilen kanallardan bildirim göndermek istiyorum, böylece GDPR uyumluluğunu sağlayabilirim.

#### Kabul Kriterleri

1. WHEN bir email hatırlatması gönderilmek istendiğinde, THE Notification_Service SHALL client'ın email kanalı için Consent_Status değerinin accepted olup olmadığını kontrol etmelidir
2. WHEN bir sms hatırlatması gönderilmek istendiğinde, THE Notification_Service SHALL client'ın sms kanalı için Consent_Status değerinin accepted olup olmadığını kontrol etmelidir
3. IF client ilgili kanal için accepted durumunda değilse, THEN THE Notification_Service SHALL bildirimi göndermemeli ve "consent_not_granted" hata kodu ile birlikte kanal adını ve client ID'sini içeren bir log kaydı oluşturmalıdır
4. WHILE client'ın bir kanalı pending durumundayken, THE Notification_Service SHALL ilgili kanaldan bildirim göndermemelidir
5. IF client'ın consent kaydı hiç bulunamazsa, THEN THE Notification_Service SHALL bildirimi göndermemeli ve "consent_record_missing" hata kodu döndürmelidir
6. WHEN bildirim consent kontrolü nedeniyle engellendiğinde, THE Notification_Service SHALL engelleme nedenini notification log tablosuna kaydetmelidir

### Gereksinim 5: Firma Panelinde Onay Durumu Görüntüleme

**Kullanıcı Hikayesi:** Bir firma yöneticisi olarak, client listesinde her client'ın kanal bazlı onay durumlarını görmek istiyorum, böylece hangi client'lara hangi kanaldan ulaşabileceğimi bilebilirim.

#### Kabul Kriterleri

1. WHEN firma yöneticisi client detay sayfasını görüntülediğinde, THE Consent_Service SHALL her Channel (email, sms) için mevcut Consent_Status değerini göstermelidir
2. THE Consent_Service SHALL pending durumundaki kanallar için "Onay Bekleniyor" etiketi göstermelidir
3. THE Consent_Service SHALL accepted durumundaki kanallar için "Onaylandı" etiketi göstermelidir
4. THE Consent_Service SHALL rejected durumundaki kanallar için "Reddedildi" etiketi göstermelidir
5. WHEN firma yöneticisi client detay sayfasını görüntülediğinde, THE Consent_Service SHALL her kanal için son güncelleme tarihini gün/ay/yıl (dd/MM/yyyy) formatında göstermelidir
6. IF client için henüz onay kaydı oluşturulmamışsa, THEN THE Consent_Service SHALL tüm kanalları "Onay Bekleniyor" durumunda göstermelidir
7. IF onay durumu verileri yüklenemezse, THEN THE Consent_Service SHALL kullanıcıya veri yüklenemediğini belirten bir hata mesajı göstermeli ve mevcut client bilgilerini koruyarak görüntülemeye devam etmelidir

### Gereksinim 6: Mevcut Verinin Migrasyonu

**Kullanıcı Hikayesi:** Bir sistem yöneticisi olarak, mevcut tek boolean onay verisini kanal bazlı yapıya sorunsuz migrate etmek istiyorum, böylece mevcut onaylar korunur.

#### Kabul Kriterleri

1. WHEN migrasyon çalıştırıldığında, THE Consent_Service SHALL gdpr_consent değeri true olan client'lar için tüm kanalları accepted durumuna geçirmelidir
2. WHEN migrasyon çalıştırıldığında, THE Consent_Service SHALL gdpr_consent değeri false olan client'lar için tüm kanalları pending durumunda oluşturmalıdır
3. WHEN migrasyon çalıştırıldığında, THE Consent_Service SHALL gdpr_consent değeri NULL olan client'lar için tüm kanalları pending durumunda oluşturmalıdır
4. THE Consent_Service SHALL migrasyon sırasında mevcut gdpr_consented_at tarihini kanal kayıtlarının güncelleme tarihine aktarmalıdır
5. THE Consent_Service SHALL migrasyon sonrası eski gdpr_consent, gdpr_consent_token ve gdpr_consented_at sütunlarını koruyarak geriye dönük uyumluluk sağlamalıdır
6. THE Consent_Service SHALL migrasyonu tek bir veritabanı transaction içinde atomik olarak gerçekleştirmelidir
7. IF migrasyon herhangi bir kayıtta başarısız olursa, THEN THE Consent_Service SHALL tüm değişiklikleri geri almalı (rollback) ve başarısız olan client ID'sini içeren bir hata mesajı döndürmelidir
8. THE Consent_Service SHALL migrasyon idempotent olmalıdır; tekrar çalıştırıldığında mevcut kanal kayıtlarını değiştirmemeli ve sadece eksik kayıtları oluşturmalıdır
