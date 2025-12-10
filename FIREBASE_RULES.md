# Firebase Security Rules for Product Sizes

To enforce the new product size pricing logic, update your `firestore.rules` with the following validation logic.

## Requirements

1. **Structure**: `sizes` must be a list of objects.
2. **Fields**: Each size must have `value` (or `label`), `extraPrice` (number).
3. **First Size**: The first size must have `extraPrice == 0` (since it represents the base product).
4. **Consistency**: If `price` (final price) is stored in the size object, it must equal `product.price + size.extraPrice`.

## Rules Snippet

Add this function to your rules and call it when writing to the `products` collection.

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper function to validate product sizes
    function validateProductSizes(requestData) {
      let sizes = requestData.sizes;
      let basePrice = requestData.price;
      
      return 
        // Allow if sizes is null or empty list
        (sizes == null || sizes.size() == 0) ||
        
        // If sizes exist:
        (
          sizes is list &&
          
          // Validate first size (index 0) has extraPrice == 0
          (sizes.size() > 0 ? sizes[0].extraPrice == 0 : true) &&
          
          // Validate all sizes
          sizes.hasAll(['label', 'extraPrice', 'price']) && // Ensure fields exist (simplified check, real iteration needed if possible or check individually)
          
          // Note: Firestore rules don't support easy iteration over lists to check every item's fields deeply.
          // You might need to rely on schema validation in your application code or Cloud Functions.
          // However, you can check specific constraints if you know the index.
          
          // Alternative: Check consistency if 'price' is stored
          // (sizes[0].price == basePrice) // First size price equals base price
        );
    }

    match /products/{productId} {
      allow read: if true;
      allow create, update: if 
        request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin' &&
        validateProductSizes(request.resource.data);
      allow delete: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

## Notes

- Firestore security rules have limitations on iterating over lists. For strict validation of *every* item in the `sizes` array, consider using a **Cloud Function** triggered on `onWrite` to validate or sanitize the data.
- The rule `sizes[0].extraPrice == 0` ensures the first size is always the base price.
- Ensure your client code sends `extraPrice: 0` for the first size.
