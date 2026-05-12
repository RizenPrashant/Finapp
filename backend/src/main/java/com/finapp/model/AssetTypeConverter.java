package com.finapp.model;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class AssetTypeConverter implements AttributeConverter<AssetType, String> {

    @Override
    public String convertToDatabaseColumn(AssetType type) {
        if (type == null) {
            return null;
        }
        return type.name();
    }

    @Override
    public AssetType convertToEntityAttribute(String dbData) {
        if (dbData == null) {
            return null;
        }
        // Case-insensitive matching
        for (AssetType type : AssetType.values()) {
            if (type.name().equalsIgnoreCase(dbData)) {
                return type;
            }
        }
        // Unknown values default to ASSET for backward compatibility
        return AssetType.ASSET;
    }
}
