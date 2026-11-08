# Image Requirements

Every image slot below currently renders an `ImagePlaceholder` (border box with
the filename + description visible) instead of a stock photo. Replace each by
dropping the real file into `client/src/assets/images/` and swapping the
`ImagePlaceholder` for a real `<img>` using the same `alt` text already
written in the component.

| Filename | Appears on | Orientation | Recommended size | Shot description |
|---|---|---|---|---|
| `warehouse-exterior.jpg` | Home — hero | Landscape (4:3) | 1600×1200px | Warehouse exterior with visible business signage. This is the first image a visitor sees — should read as established and organised, not a construction site. |
| `warehouse-interior.jpg` | Home — company intro; Services — infrastructure | Landscape (4:3 / 16:10) | 1600×1200px | Interior shot of the warehouse floor showing organised lubricant storage. |
| `lubricant-storage-racks.jpg` | Services — infrastructure | Landscape (16:10) | 1600×1000px | Storage racks holding HPCL lubricant drums/cartons, organised by grade — close enough to read labels/organisation. |
| `dispatch-loading-area.jpg` | Services — infrastructure | Landscape (16:10) | 1600×1000px | Loading area during (or staged for) consignment dispatch. |
| `product-inventory.jpg` | Services — infrastructure | Landscape (16:10) | 1600×1000px | Packaged lubricant product inventory awaiting dispatch — cartons/drums, not a wide empty warehouse shot. |
| `business-signage.jpg` | About — intro | Landscape (4:3) | 1600×1200px | Office or warehouse signage showing the business name — establishes legitimacy/place. |

## Shooting notes (applies to all)

- Consistent aspect ratios per the table above — the layout is fixed-ratio, so a wrong-ratio photo will get cropped.
- Moderate contrast, minimal filtering — these should read as real operational photography, not styled marketing shots.
- Real HPCL product packaging is fine and expected to appear (it's genuinely your stock); do not use a competitor's or generic unbranded packaging as a stand-in.
- No people are required in any shot listed above. If you do include staff, get their consent first and keep it incidental (not a posed "team photo" — that's out of scope for this set).

## Not required but worth having later

- A wide "team/staff" shot for a future About-page expansion, if you want to put a face to the business.
- A short vehicle/dispatch-in-transit shot, if delivery vehicles are part of daily operations and you want to show that leg explicitly.
