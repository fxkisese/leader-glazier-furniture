{
  "name": "Product",
  "type": "object",
  "properties": {
    "name": {
      "type": "string"
    },
    "category": {
      "type": "string",
      "enum": [
        "sofas",
        "tv-stands",
        "shoe-racks",
        "wardrobes",
        "beds",
        "coffee-tables",
        "dining-sets",
        "office-desks",
        "office-chairs",
        "cabinets",
        "chest-of-drawers",
        "custom-furniture"
      ]
    },
    "subcategory": {
      "type": "string"
    },
    "price": {
      "type": "number"
    },
    "discount_price": {
      "type": "number"
    },
    "description": {
      "type": "string"
    },
    "material": {
      "type": "string"
    },
    "dimensions": {
      "type": "string"
    },
    "colors": {
      "type": "string"
    },
    "images": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "stock_status": {
      "type": "string",
      "enum": [
        "in-stock",
        "out-of-stock",
        "made-to-order"
      ],
      "default": "in-stock"
    },
    "label": {
      "type": "string",
      "enum": [
        "",
        "new-arrival",
        "best-seller",
        "limited-offer",
        "custom-order"
      ],
      "default": ""
    },
    "is_featured": {
      "type": "boolean",
      "default": false
    },
    "is_published": {
      "type": "boolean",
      "default": true
    },
    "whatsapp_message": {
      "type": "string"
    },
    "delivery_note": {
      "type": "string"
    },
    "seating_capacity": {
      "type": "string"
    }
  },
  "required": [
    "name",
    "category",
    "price"
  ]
}