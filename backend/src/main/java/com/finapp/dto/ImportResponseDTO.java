package com.finapp.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImportResponseDTO {
    private boolean success;
    private String message;
    private int totalRows;
    private int importedCount;
    private int failedCount;
    private int duplicatesSkipped;
    private List<String> errors;

    // The rows that were skipped as already present. A count alone left the
    // reader unable to tell a correct re-import from one that silently
    // dropped rows it should have taken.
    private List<Map<String, Object>> duplicates;
    private List<Map<String, Object>> previewData;
    private boolean isPreview;
}
