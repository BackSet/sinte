package com.sinte.backend.service;

import java.io.ByteArrayOutputStream;
import java.util.List;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

@Service
public class MatchExportService {

    public byte[] exportConfirmedPlayersExcel(String matchTitle, List<MatchService.ConfirmedPlayer> players) {
        try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Confirmados");

            int rowIndex = 0;
            Row titleRow = sheet.createRow(rowIndex++);
            titleRow.createCell(0).setCellValue("Partido");
            titleRow.createCell(1).setCellValue(matchTitle);

            Row header = sheet.createRow(rowIndex++);
            header.createCell(0).setCellValue("Nombre");
            header.createCell(1).setCellValue("Email");
            header.createCell(2).setCellValue("Codigo");
            header.createCell(3).setCellValue("Posicion principal");

            for (MatchService.ConfirmedPlayer player : players) {
                Row row = sheet.createRow(rowIndex++);
                row.createCell(0).setCellValue(player.fullName());
                row.createCell(1).setCellValue(player.email());
                row.createCell(2).setCellValue(player.playerHandle() != null ? player.playerHandle() : "");
                row.createCell(3).setCellValue(player.primaryPosition() != null ? player.primaryPosition() : "");
            }

            for (int cell = 0; cell < 4; cell++) {
                sheet.autoSizeColumn(cell);
            }

            workbook.write(output);
            return output.toByteArray();
        } catch (Exception ex) {
            throw new DomainException("No se pudo generar el archivo de confirmados");
        }
    }
}
