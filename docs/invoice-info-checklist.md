# Invoice and quotation information checklist

The system builds the invoice or quotation PDF automatically from the details below. Numbering (for example `INV-2026-0001`), line totals, discount, VAT, balance due, version history and the branded PDF are all generated for you.

## Part A: ask the CLIENT for these (per invoice or quotation)

| # | What to ask | Why / where it appears |
|---|---|---|
| 1 | Name to bill (person, or the company's full legal name) | "Billed to" |
| 2 | Company name (if billing a company) | "Billed to" |
| 3 | Billing address | "Billed to" |
| 4 | Email address to send the document to | The PDF is emailed here |
| 5 | Phone number | "Billed to" |
| 6 | BIN / TIN (only if the client needs a VAT / tax invoice) | "Billed to" |
| 7 | Project name and site address | "Project" box |
| 8 | PO or work-order number, if the client uses one | "Client ref" |
| 9 | What work to include: for each item the description, quantity, unit (room, sq ft, lot, pcs) and price. Or: "please use our quotation" | The items table |
| 10 | Any agreed discount (a % or a taka amount) | Discount line |
| 11 | Is VAT / tax applicable, and at what % | VAT line |
| 12 | Agreed payment terms: advance %, milestone payments, final payment | "Payment terms" |
| 13 | Due date for payment (invoice) or how long the quotation stays valid | Due date / "Valid until" |
| 14 | Who signs for acceptance (name and designation) | Client acceptance line on quotations |
| 15 | Preferred way to pay (bank transfer, bKash, Nagad, cheque) | "How to pay" |
| 16 | Any special notes or conditions the client wants written on the document | "Notes" |

## Part B: from YOU, once (enter in Admin > Settings > Company details)

| # | What | Appears on |
|---|---|---|
| 1 | Company legal / trading name and tagline | Header of every PDF and email |
| 2 | Office address, phone, email, website | Header |
| 3 | Trade licence number | Footer |
| 4 | TIN | Footer |
| 5 | BIN (VAT registration) | Footer |
| 6 | Bank details: bank, branch, account name, account number, routing number | "How to pay" on invoices |
| 7 | bKash / Nagad / Rocket merchant numbers | "How to pay" |
| 8 | Name and title of the person who signs (for example Founder and Principal Designer) | Signature line |
| 9 | Default VAT label and % (use 0 if you do not charge VAT) | New documents |
| 10 | How many days a quotation stays valid (default 15) | "Valid until" |
| 11 | Your standard payment terms (default is 50% advance, 40% on carpentry, 10% on handover) | New documents |
| 12 | Your standard terms and conditions | Bottom of the document |
| 13 | A short thank-you line for the footer | Footer |
| 14 | Email sending: a Gmail (or other SMTP) address and its app password, plus the inbox that should receive a copy of everything sent | Sends the PDF to the client and a copy to you |

Not needed: the logo (already built into the PDF), invoice numbers (automatic), totals and VAT (calculated), payment status (updates when you record a payment).
