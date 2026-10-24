# Calculator and quotation: what the studio must supply

The calculator, the emailed quotation and the PDF are fully built. They run on **placeholder** figures until the items below are
confirmed. Nothing here is invented: every missing value is shown as "to be added".

## Pricing (`config/pricing.json`, `"placeholder": true`)

- [ ] Rate per sq ft or per unit for every space, for each package (Essential, Premium, Luxury).
- [ ] Rate for the office "Air conditioning provisions" option, a single selection for the whole office (ceiling cut-outs, concealed ducting, controls; currently a placeholder).
- [ ] Rates for office and showroom spaces (display floor, counter, display units, fitting rooms, lounge, stock room, signage).
- [ ] Add-on prices: smart-home wiring, furniture and decor styling, 3D visualisation pack.
- [ ] Tax: whether VAT applies, label and percentage (`tax`).
- [ ] The width of the price range shown on the quotation (`rangeSpread`, now 10%) and the rounding step (`roundTo`).
- [ ] Rules for "best fit" (size and room-count thresholds).
- [ ] Wording of the package features and of the assumptions and exclusions printed on the PDF.
- [ ] Then set `"placeholder": false` so the "placeholder rates" notices disappear.

## Company details on the PDF and emails (Admin, Settings)

- [ ] Studio name, tagline, address, phone, email, website.
- [ ] Trade licence, TIN and BIN numbers; authorised signatory name and title.
- [ ] Bank and mobile-banking details; default payment terms; quotation validity in days; footer line.

## Email

- [ ] An SMTP account (host, port, user, password) and a sender address; the inbox that receives every quotation and consultation.
- [ ] Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`, `NOTIFY_TO` in Vercel. Until then email is not delivered.

## Content

- [ ] Real project photos and before/after pairs (Admin: Website, Images and Before / after).
- [ ] Verified studio numbers (projects completed, cities served), founder name and photo, and the About story.
- [ ] Privacy Policy and Terms reviewed by a qualified professional.
