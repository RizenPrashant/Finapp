package com.finapp.model;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class AssetCategoryConverter implements AttributeConverter<AssetCategory, String> {

    @Override
    public String convertToDatabaseColumn(AssetCategory category) {
        if (category == null) {
            return null;
        }
        return category.name();
    }

    @Override
    public AssetCategory convertToEntityAttribute(String dbData) {
        if (dbData == null) {
            return null;
        }
        // Case-insensitive matching
        for (AssetCategory category : AssetCategory.values()) {
            if (category.name().equalsIgnoreCase(dbData)) {
                return category;
            }
        }
        // Unknown values default to OTHER for backward compatibility
        return AssetCategory.OTHER;
    }
}
