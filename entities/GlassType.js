{
  "name": "GlassType",
  "type": "object",
  "properties": {
    "name": {
      "type": "string"
    },
    "category": {
      "type": "string",
      "enum": [
        "clear",
        "tinted",
        "frosted",
        "toughened",
        "laminated",
        "mirror",
        "one-way",
        "shower",
        "table-top",
        "office-partition",
        "window",
        "decorative"
      ]
    },
    "description": {
      "type": "string"
    },
    "image": {
      "type": "string"
    },
    "thickness": {
      "type": "string"
    },
    "price_per_sqft": {
      "type": "number"
    },
    "min_order_sqft": {
      "type": "number"
    },
    "installation_price": {
      "type": "number"
    },
    "frame_price_per_sqft": {
      "type": "number"
    },
    "is_available": {
      "type": "boolean",
      "default": true
    },
    "notes": {
      "type": "string"
    }
  },
  "required": [
    "name",
    "category",
    "price_per_sqft"
  ]
}