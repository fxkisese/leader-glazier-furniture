{
  "name": "Review",
  "type": "object",
  "properties": {
    "customer_name": {
      "type": "string"
    },
    "rating": {
      "type": "number"
    },
    "comment": {
      "type": "string"
    },
    "product_type": {
      "type": "string"
    },
    "is_featured": {
      "type": "boolean",
      "default": true
    }
  },
  "required": [
    "customer_name",
    "rating",
    "comment"
  ]
}