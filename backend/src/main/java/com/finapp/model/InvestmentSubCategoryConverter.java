package com.finapp.model;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class InvestmentSubCategoryConverter implements AttributeConverter<InvestmentSubCategory, String> {

    @Override
    public String convertToDatabaseColumn(InvestmentSubCategory subCategory) {
        if (subCategory == null) {
            return null;
        }
        return subCategory.name();
    }

    @Override
    public InvestmentSubCategory convertToEntityAttribute(String dbData) {
        if (dbData == null) {
            return null;
        }
        // Case-insensitive matching
        for (InvestmentSubCategory subCategory : InvestmentSubCategory.values()) {
            if (subCategory.name().equalsIgnoreCase(dbData)) {
                return subCategory;
            }
        }
        // Unknown values default to OTHER for backward compatibility
        return InvestmentSubCategory.OTHER;
    }
}
