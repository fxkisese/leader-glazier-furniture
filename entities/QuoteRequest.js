{
  "name": "QuoteRequest",
  "type": "object",
  "properties": {
    "customer_name": {
      "type": "string"
    },
    "phone": {
      "type": "string"
    },
    "glass_type_id": {
      "type": "string"
    },
    "glass_type_name": {
      "type": "string"
    },
    "width": {
      "type": "number"
    },
    "height": {
      "type": "number"
    },
    "unit": {
      "type": "string",
      "enum": [
        "feet",
        "inches",
        "cm",
        "meters"
      ]
    },
    "area_sqft": {
      "type": "number"
    },
    "quantity": {
      "type": "number"
    },
    "include_installation": {
      "type": "boolean"
    },
    "include_frame": {
      "type": "boolean"
    },
    "include_delivery": {
      "type": "boolean"
    },
    "delivery_location": {
      "type": "string"
    },
    "estimated_total": {
      "type": "number"
    },
    "status": {
      "type": "string",
      "enum": [
        "new",
        "contacted",
        "completed",
        "cancelled"
      ],
      "default": "new"
    },
    "notes": {
      "type": "string"
    }
  },
  "required": [
    "glass_type_name",
    "width",
    "height",
    "unit",
    "estimated_total"
  ]
}