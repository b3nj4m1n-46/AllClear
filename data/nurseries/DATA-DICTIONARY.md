# Data Dictionary: OrAssocNurseries

**Source ID:** N/A (business directory, not a plant dataset)
**Description:** Oregon Association of Nurseries member directory. 833 nurseries/suppliers with contact info, specialties, and shipping regions.
**Primary Join Key:** `Name`

**NOTE:** This is a **nursery/supplier directory**, not a plant database. It's useful for sourcing plants once selections are made.

## Files

### `nurseries.csv` (833 records)

#### `Name`
- **Definition:** Business name
- **Type:** text

#### `Business Type`
- **Definition:** Type of business
- **Type:** text
- **Values include:** Grower, Retailer, Re-Wholesaler/Broker, Allied Service or Supplier

#### `Company Type`
- **Definition:** Detailed business categories
- **Type:** text

#### `Ships To`
- **Definition:** Geographic regions the business ships to
- **Type:** text (comma-separated region names)

#### `Mailing Address` / `City` / `State` / `Zip`
- **Definition:** Business address fields
- **Type:** text

#### `Phone` / `Fax` / `Email` / `Website`
- **Definition:** Contact information
- **Type:** text *(some nullable)*

#### `Description`
- **Definition:** Business description/specialty text
- **Type:** text

#### `Supply Categories`
- **Definition:** What the business supplies (semicolon-separated)
- **Type:** text
- **Values include:** Native Plants; Perennials; Trees; Shrubs; Seeds; Groundcovers; Ornamental Grasses; etc.

#### `Slug`
- **Definition:** URL-safe business identifier
- **Type:** text

## Merge Guidance

- This dataset does **NOT** merge with plant datasets on scientific name
- Use the `Supply Categories` field to find nurseries that carry specific plant types
- Filter by `State` and `Ships To` for regional sourcing
