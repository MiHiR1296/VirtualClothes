import { logDebug, logInfo, logWarn, logError } from "./logger.js";
import React, { useState, useEffect, useRef } from 'react';
import { FileDown, Loader, Download, Info, ScissorsSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { useTextureContext } from './TextureContext';
import ModifiedMultiViewCapture from './ModifiedMultiViewCapture';
import MaterialSpecs from './MaterialSpecs';
import MeasurementsTable from './MeasurementsTable';
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import * as THREE from 'three';

// Color mapping to Pantone values
const hexToPantone = {
  '#ffffff': 'Pantone 11-0601 TCX (Bright White)',
  '#000000': 'Pantone 19-4005 TCX (Black)',
  '#ff0000': 'Pantone 18-1664 TCX (True Red)',
  '#0000ff': 'Pantone 19-3952 TCX (Spectrum Blue)',
  '#ffff00': 'Pantone 13-0759 TCX (Lemon Chrome)',
  '#00ff00': 'Pantone 15-6437 TCX (Kelly Green)',
  '#888888': 'Pantone 17-1501 TCX (Frost Gray)',
  '#d3d3d3': 'Pantone 13-4104 TCX (Silver Gray)',
  '#f2f2f2': 'Pantone 11-0601 TCX (Bright White)',
  '#808080': 'Pantone 17-1501 TCX (Cool Gray)',
  '#4682B4': 'Pantone 18-4032 TCX (Steel Blue)'
};

// Default seam specifications by garment type
const seamSpecifications = {
  'men_polo_hs': [
    {
      name: 'Double Needle Flatlock',
      width: '5.6mm',
      stitchesPerInch: '7.475',
      location: 'Bottom hem, sleeve cuffs',
      lineCount: 1
    },
    {
      name: 'Single Needle Chain Stitch',
      width: '0.2cm',
      stitchesPerInch: '8',
      location: 'Placket, collar',
      lineCount: 1
    }
  ],
  'men_round_hs': [
    {
      name: 'Double Needle Flatlock',
      width: '5.6mm',
      stitchesPerInch: '7.475',
      location: 'Bottom hem, sleeve cuffs',
      lineCount: 1
    },
    {
      name: 'Single Needle Chain Stitch',
      width: '0.2cm',
      stitchesPerInch: '8',
      location: 'Neck tape, shoulders',
      lineCount: 1
    }
  ],
  'men_hoodie': [
    {
      name: 'Double Needle Flatlock',
      width: '5.6mm',
      stitchesPerInch: '7.475',
      location: 'Bottom hem, cuffs, hood edge',
      lineCount: 1
    },
    {
      name: 'Single Needle Chain Stitch',
      width: '0.2cm',
      stitchesPerInch: '8',
      location: 'Zipper attachment, pockets',
      lineCount: 1
    }
  ]
};

// Trim specifications by garment type
const trimSpecifications = {
  'men_polo_hs': [
    {
      type: 'Button',
      description: 'Flat button 4 holes',
      color: '#808080',
      diameter: '11mm',
      location: 'Collar stand, placket'
    },
    {
      type: 'Buttonhole',
      description: 'Standard buttonhole',
      length: '12mm',
      location: 'Collar stand, placket'
    }
  ],
  'men_round_hs': [],
  'men_hoodie': [
    {
      type: 'Zipper',
      description: 'YKK metal zipper',
      color: '#808080',
      size: '#5',
      length: 'Full front',
      location: 'Center front'
    },
    {
      type: 'Cord',
      description: 'Drawstring cord',
      color: '#808080',
      diameter: '5mm',
      location: 'Hood'
    }
  ]
};

// Get fabric specifications by material type
const getFabricSpecifications = (materialType) => {
  const materialSpecs = {
    'cotton': {
      composition: '100% Cotton',
      weight: '243 g/m²',
      type: 'Interlock',
      care: 'Machine wash cold, tumble dry low',
      shrinkage: '3-5%'
    },
    'nylon': {
      composition: '100% Nylon',
      weight: '120 g/m²',
      type: 'Ripstop',
      care: 'Machine wash cold, hang dry',
      shrinkage: '1-2%'
    },
    'leather': {
      composition: 'Genuine Leather',
      weight: '1.2mm thickness',
      type: 'Full grain',
      care: 'Wipe clean with damp cloth',
      shrinkage: 'None'
    },
    'cotton_100': {
      composition: '100% Cotton',
      weight: '180 g/m²',
      type: 'Interlock',
      care: 'Machine wash cold, tumble dry low',
      shrinkage: '3-5%'
    },
    'cotton_95_lycra5': {
      composition: '95% Cotton, 5% Lycra',
      weight: '290 g/m²',
      type: 'Jersey',
      care: 'Machine wash cold, tumble dry low',
      shrinkage: '3-5%'
    },
    'cotton_60_poly40': {
      composition: '60% Cotton, 40% Polyester',
      weight: '175 g/m²',
      type: 'Blend',
      care: 'Machine wash cold, tumble dry low',
      shrinkage: '3-5%'
    },
    'cotton_57_modal38_spandex5': {
      composition: '57% Cotton, 38% Modal, 5% Spandex',
      weight: '275 g/m²',
      type: 'Stretch',
      care: 'Machine wash cold, tumble dry low',
      shrinkage: '3-5%'
    },
    'metal': {
      composition: 'Zinc Alloy',
      weight: 'Medium',
      type: 'Metal',
      care: 'Wipe clean',
      shrinkage: 'None'
    },
    'plastic': {
      composition: 'Polycarbonate',
      weight: 'Light',
      type: 'Plastic',
      care: 'Wipe clean',
      shrinkage: 'None'
    }
  };
  
  return materialSpecs[materialType] || materialSpecs['cotton'];
};

const getNearestPantone = (hexColor) => {
  if (hexToPantone[hexColor.toLowerCase()]) {
    return hexToPantone[hexColor.toLowerCase()];
  }
  return 'Pantone Custom (Please match to standard)';
};

// Compresses an image by resizing it and reducing quality
const compressImage = (dataUrl, maxWidth = 1200, quality = 0.85) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      // Create a fixed-size canvas
      const canvas = document.createElement('canvas');
      canvas.width = maxWidth;
      canvas.height = maxWidth;
      
      const ctx = canvas.getContext('2d');
      
      // Fill with bright white background for better contrast
      ctx.fillStyle = 'white'; 
      ctx.fillRect(0, 0, maxWidth, maxWidth);
      
      // Calculate scaling to maintain aspect ratio
      const scale = Math.min(
        maxWidth / img.width, 
        maxWidth / img.height
      );
      
      const scaledWidth = img.width * scale;
      const scaledHeight = img.height * scale;
      
      // Center the image
      const offsetX = (maxWidth - scaledWidth) / 2;
      const offsetY = (maxWidth - scaledHeight) / 2;
      
      // Draw the image with improved sharpness
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(
        img, 
        offsetX, 
        offsetY, 
        scaledWidth, 
        scaledHeight
      );
      
      // Apply contrast enhancement (keeping original logic)
      const imageData = ctx.getImageData(0, 0, maxWidth, maxWidth);
      const data = imageData.data;
      
      // Apply basic contrast enhancement
      const contrast = 1.1; // Slight contrast boost
      const brightness = 5; // Slight brightness boost
      
      for (let i = 0; i < data.length; i += 4) {
        // Skip fully transparent pixels
        if (data[i + 3] === 0) continue;
        
        // Apply contrast and brightness adjustment
        for (let j = 0; j < 3; j++) {
          data[i + j] = Math.max(0, Math.min(255, 
            (data[i + j] - 128) * contrast + 128 + brightness
          ));
        }
      }
      
      ctx.putImageData(imageData, 0, 0);
      
      // Convert to compressed JPEG format with higher quality
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = dataUrl;
  });
};



const TechPack = ({ 
  selectedModel, 
  selectedMaterial, 
  materialManager, 
  renderer, 
  scene, 
  camera,
  controls 
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const multiViewRef = useRef();
  const [modelTitle, setModelTitle] = useState('');
  const { layers } = useTextureContext();
  
  // Set model title based on selected model
  useEffect(() => {
    if (selectedModel) {
      const modelConfig = window.MODEL_PATHS?.[selectedModel] || { name: selectedModel };
      setModelTitle(modelConfig.name || 'Garment');
    }
  }, [selectedModel]);

  // Generate a style ID based on the model name
  const generateStyleID = () => {
    const modelParts = selectedModel.split('_');
    let prefix = '';
    
    if (modelParts.length > 0) {
      // Extract initial letters and make them uppercase
      modelParts.forEach(part => {
        if (part.length > 0) {
          prefix += part.charAt(0).toUpperCase();
        }
      });
    }
    
    // Add current timestamp to make it unique
    const timestamp = new Date().getTime().toString().slice(-4);
    return `${prefix}_${timestamp}`;
  };

  // Function to generate the tech pack with improved layout
  const generateTechPack = async () => {
    try {
      setIsGenerating(true);
      
      // Check if multiViewRef exists and has captures
      if (!multiViewRef.current || !multiViewRef.current.captures || multiViewRef.current.captures.length === 0) {
        // No captures available, try to capture views first
        if (multiViewRef.current && multiViewRef.current.captureMultipleViews) {
          await multiViewRef.current.captureMultipleViews();
          
          // Wait for captures to be processed
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // If still no captures, alert the user
        if (!multiViewRef.current || !multiViewRef.current.captures || multiViewRef.current.captures.length === 0) {
          alert('Please capture views before generating the tech pack.');
          setIsGenerating(false);
          return;
        }
      }
      
      const capturesToUse = multiViewRef.current.captures;
      
      // Step 2: Create PDF with working autotable
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      // Document styling with reduced whitespace
      const headerStyle = { fontSize: 14, font: 'helvetica', style: 'bold' }; // Reduced from 18
      const subheaderStyle = { fontSize: 12, font: 'helvetica', style: 'bold' }; // Reduced from 14
      const textStyle = { fontSize: 8, font: 'helvetica', style: 'normal' }; // Reduced from 10
      
      // Margins
      const margin = 10; // Reduced from 20
      const pageWidth = 210; // A4 width in mm
      const contentWidth = pageWidth - (margin * 2);
      
      // Generate style ID and other metadata
      const styleID = generateStyleID();
      const styleDate = new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      const category = selectedModel.includes('men') ? 'Men' : 'Women';
      const modelData = window.MODEL_PATHS?.[selectedModel] || { name: selectedModel };
      
      // Add company header/logo with reduced height
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, margin, contentWidth, 15, 'F'); // Reduced from 20
      doc.setFontSize(headerStyle.fontSize);
      doc.setTextColor(0, 0, 0);
      doc.setFont(headerStyle.font, headerStyle.style);
      doc.text("GARMENT TECHNICAL PACKAGE", pageWidth / 2, margin + 8, { align: 'center' });
      
      // Add top information table with more compact layout
      doc.setFontSize(textStyle.fontSize);
      doc.setFont(textStyle.font, textStyle.style);
      
      const topTableData = [
        ['BRAND:', '3D Garment'],
        ['ART', styleID],
        ['ART NAME:', modelData.name || selectedModel],
        ['Fabric', materialSpecs[selectedMaterial]?.composition || selectedMaterial],
        ['DATE:', styleDate]
      ];
      
      const rightTopTableData = [
        ['DESIGNER:', 'Virtual Clothes'],
        ['COLLECTION:', 'SS ' + new Date().getFullYear()],
        ['CATEGORY:', category],
        ['SIZE:', 'M']
      ];
      
      // Draw top table
      const tableColWidths = [25, contentWidth/2 - 25]; // Reduced width
      const startY = margin + 18; // Reduced from 25
      
      // Left side table with more compact rows
      autoTable(doc, {
        startY: startY,
        body: topTableData,
        theme: 'plain',
        tableWidth: contentWidth/2,
        styles: {
          fontSize: 7, // Reduced from 8
          cellPadding: 1 // Reduced from 2
        },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: tableColWidths[0] },
          1: { cellWidth: tableColWidths[1] }
        },
        margin: { left: margin }
      });
      
      // Right side table with more compact rows
      autoTable(doc, {
        startY: startY,
        body: rightTopTableData,
        theme: 'plain',
        tableWidth: contentWidth/2,
        styles: {
          fontSize: 7, // Reduced from 8
          cellPadding: 1 // Reduced from 2
        },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: tableColWidths[0] },
          1: { cellWidth: tableColWidths[1] }
        },
        margin: { left: margin + contentWidth/2 }
      });

      // Add all views in a grid (front, 3/4, side, back)
      let yPosition = doc.lastAutoTable.finalY + 5; // Reduced from 10
      
      if (capturesToUse.length > 0) {
        // View layout
        const viewsPerRow = 2;
        const viewWidth = (contentWidth / viewsPerRow) - 3; // Reduced spacing
        const viewHeight = viewWidth * 0.8;
        
        // Log available views for debugging
        logDebug("Available capture views:", capturesToUse.map(c => c.name));
        
        // Find different views with more flexible matching
        const frontView = capturesToUse.find(c => c.name === 'Front');
        const threeQuarterView = capturesToUse.find(c => c.name === '3/4 View');
        const backView = capturesToUse.find(c => c.name === 'Back');
        const sideView = capturesToUse.find(c => c.name === 'Side');
        
        logDebug("Found views:", { 
          frontView: !!frontView, 
          threeQuarterView: !!threeQuarterView,
          backView: !!backView,
          sideView: !!sideView
        });
        
        // First row: Front and 3/4 views
        if (frontView && threeQuarterView) {
          doc.addImage(frontView.url, 'JPEG', margin, yPosition, viewWidth, viewHeight);
          doc.addImage(threeQuarterView.url, 'JPEG', margin + viewWidth + 6, yPosition, viewWidth, viewHeight);
          
          // Add view names
          doc.setFontSize(7);
          doc.setFont('helvetica', 'bold');
          doc.text("Front View", margin + viewWidth/2, yPosition + viewHeight + 4, { align: 'center' });
          doc.text("3/4 View", margin + viewWidth + 6 + viewWidth/2, yPosition + viewHeight + 4, { align: 'center' });
          
          yPosition += viewHeight + 8; // Move to next row with reduced spacing
        }
        
        // Second row: Back and Side views
        if (backView && sideView) {
          doc.addImage(backView.url, 'JPEG', margin, yPosition, viewWidth, viewHeight);
          doc.addImage(sideView.url, 'JPEG', margin + viewWidth + 6, yPosition, viewWidth, viewHeight);
          
          // Add view names
          doc.setFontSize(7);
          doc.setFont('helvetica', 'bold');
          doc.text("Back View", margin + viewWidth/2, yPosition + viewHeight + 4, { align: 'center' });
          doc.text("Side View", margin + viewWidth + 6 + viewWidth/2, yPosition + viewHeight + 4, { align: 'center' });
          
          yPosition += viewHeight + 8;
        }
        
        // If we don't have all views, try a fallback arrangement
        if (!frontView || !threeQuarterView || !backView || !sideView) {
          logDebug("Using fallback view arrangement");
          // Fallback: just use the captures we have, in order
          const viewsPerRow = 2;
          const capturesArray = [...capturesToUse];
          
          for (let i = 0; i < capturesArray.length; i += viewsPerRow) {
            const row = capturesArray.slice(i, i + viewsPerRow);
            
            row.forEach((capture, index) => {
              const xPosition = margin + (index * (viewWidth + 6));
              doc.addImage(capture.url, 'JPEG', xPosition, yPosition, viewWidth, viewHeight);
              
              // Add view name
              doc.setFontSize(7);
              doc.setFont('helvetica', 'bold');
              doc.text(capture.name, xPosition + viewWidth/2, yPosition + viewHeight + 4, { align: 'center' });
            });
            
            yPosition += viewHeight + 8; // Move to next row
          }
        }
      }
      
      // Add style details and construction notes
      yPosition += 5;
      doc.setFontSize(subheaderStyle.fontSize);
      doc.setFont(subheaderStyle.font, subheaderStyle.style);
      doc.text("STYLE NOTES", margin, yPosition);
      
      yPosition += 7;
      doc.setFontSize(textStyle.fontSize);
      doc.setFont(textStyle.font, textStyle.style);
      
      // Add callouts based on model type
      const callouts = getModelCallouts(selectedModel);
      let calloutText = "";
      callouts.forEach((callout, idx) => {
        calloutText += `${idx + 1}. ${callout.text}\n`;
      });
      
      // Add callout text in a more compact format
      doc.setLineHeightFactor(1.1); // Reduce line height
      doc.text(calloutText, margin, yPosition);
      
      // Add materials specifications table on a new page
      doc.addPage();
      doc.setFontSize(headerStyle.fontSize);
      doc.setFont(headerStyle.font, headerStyle.style);
      doc.text("FABRIC & TRIM SPECIFICATIONS", pageWidth / 2, margin, { align: 'center' });
      
      // Create material specifications table
      const fabricSpec = getFabricSpecifications(selectedMaterial);
      
      const materialTableHead = [['DESCRIPTION', 'COMPOSITION', 'WEIGHT', 'CARE']];
      const materialTableBody = [
        [`MAIN FABRIC`, fabricSpec.composition, fabricSpec.weight, fabricSpec.care],
        [`TRIM`, trimSpecifications[selectedModel]?.[0]?.description || 'N/A', '', '']
      ];
      
      // Add material spec table
      autoTable(doc, {
        startY: margin + 10,
        head: materialTableHead,
        body: materialTableBody,
        theme: 'grid',
        styles: {
          fontSize: 8,
          cellPadding: 2 // Reduced from 3
        },
        headStyles: {
          fillColor: [240, 240, 240],
          textColor: [0, 0, 0],
          fontStyle: 'bold'
        },
        margin: { left: margin, right: margin }
      });
      
      // Add seam specifications table
      const seams = seamSpecifications[selectedModel] || [];
      
      if (seams.length > 0) {
        const seamTableY = doc.lastAutoTable.finalY + 10; // Reduced from 20
        doc.setFontSize(subheaderStyle.fontSize);
        doc.setFont(subheaderStyle.font, subheaderStyle.style);
        doc.text("SEAM SPECIFICATIONS", pageWidth / 2, seamTableY, { align: 'center' });
        
        const seamTableHead = [['SEAM TYPE', 'WIDTH', 'SPI', 'LOCATION']];
        const seamTableBody = seams.map(seam => [
          seam.name,
          seam.width,
          seam.stitchesPerInch,
          seam.location
        ]);
        
        autoTable(doc, {
          startY: seamTableY + 6, // Reduced from 10
          head: seamTableHead,
          body: seamTableBody,
          theme: 'grid',
          styles: {
            fontSize: 8,
            cellPadding: 2 // Reduced from 3
          },
          headStyles: {
            fillColor: [240, 240, 240],
            textColor: [0, 0, 0],
            fontStyle: 'bold'
          },
          margin: { left: margin, right: margin }
        });
      }
      
      // Add trim specifications table
      const trims = trimSpecifications[selectedModel] || [];
      
      if (trims.length > 0) {
        const trimTableY = doc.lastAutoTable.finalY + 10; // Reduced from 20
        doc.setFontSize(subheaderStyle.fontSize);
        doc.setFont(subheaderStyle.font, subheaderStyle.style);
        doc.text("TRIM SPECIFICATIONS", pageWidth / 2, trimTableY, { align: 'center' });
        
        const trimTableHead = [['TRIM TYPE', 'DESCRIPTION', 'COLOR', 'LOCATION']];
        const trimTableBody = trims.map(trim => [
          trim.type,
          trim.description,
          trim.color,
          trim.location
        ]);
        
        autoTable(doc, {
          startY: trimTableY + 6, // Reduced from 10
          head: trimTableHead,
          body: trimTableBody,
          theme: 'grid',
          styles: {
            fontSize: 8,
            cellPadding: 2 // Reduced from 3
          },
          headStyles: {
            fillColor: [240, 240, 240],
            textColor: [0, 0, 0],
            fontStyle: 'bold'
          },
          margin: { left: margin, right: margin }
        });
      }
      
      // Add color specifications
      const colorTableY = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(subheaderStyle.fontSize);
      doc.setFont(subheaderStyle.font, subheaderStyle.style);
      doc.text("COLOR SPECIFICATIONS", pageWidth / 2, colorTableY, { align: 'center' });
      
      const colorData = extractColorData();
      if (colorData.length > 0) {
        // Create a table for colors
        const colorRows = colorData.map(color => {
          return [
            {
              content: '',
              styles: {
                fillColor: [color.rgb.r, color.rgb.g, color.rgb.b],
                minCellWidth: 12
              }
            },
            color.name,
            getNearestPantone(color.hex)
          ];
        });
        
        autoTable(doc, {
          startY: colorTableY + 6,
          head: [['Color', 'Component', 'Pantone Reference']],
          body: colorRows,
          theme: 'grid',
          styles: {
            fontSize: 8,
            cellPadding: 2
          },
          columnStyles: {
            0: { cellWidth: 12 },
            1: { cellWidth: 50 }
          },
          headStyles: {
            fillColor: [220, 220, 220],
            textColor: [0, 0, 0],
            fontStyle: 'bold'
          },
          margin: { left: margin, right: margin }
        });
      }
      
      // Add measurements table
      const measurementTableY = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(subheaderStyle.fontSize);
      doc.setFont(subheaderStyle.font, subheaderStyle.style);
      doc.text("SIZE SPECIFICATIONS", pageWidth / 2, measurementTableY, { align: 'center' });
      
      // Create a well-formatted measurements table
      const measurementData = getMeasurementData();
      if (measurementData && measurementData.sizes && measurementData.measurements) {
        const tableHead = ['Measurement', ...measurementData.sizes];
        const tableBody = Object.entries(measurementData.measurements).map(([name, values]) => {
          return [name + ' (cm)', ...values.map(v => v.toString())];
        });
        
        autoTable(doc, {
          startY: measurementTableY + 6,
          head: [tableHead],
          body: tableBody,
          theme: 'grid',
          styles: {
            fontSize: 7,
            cellPadding: 2
          },
          headStyles: {
            fillColor: [220, 220, 220],
            textColor: [0, 0, 0],
            fontStyle: 'bold'
          },
          margin: { left: margin, right: margin }
        });
        
        // Add measurement guide
        const tableEndY = doc.lastAutoTable.finalY + 5;
        doc.setFontSize(subheaderStyle.fontSize - 1);
        doc.setFont(subheaderStyle.font, subheaderStyle.style);
        doc.text("Measurement Guide", margin, tableEndY);
        
        const measurementGuide = [
          "Chest Width: Measured across the chest at the widest point",
          "Length: Measured from highest point of shoulder to bottom hem",
          "Shoulder Width: Measured from shoulder seam to shoulder seam",
          "Sleeve Length: Measured from shoulder seam to end of sleeve"
        ];
        
        if (selectedModel.includes('hoodie')) {
          measurementGuide.push("Hood Length: Measured from hood seam to the top");
        }
        
        doc.setFontSize(textStyle.fontSize);
        doc.setFont(textStyle.font, textStyle.style);
        let lineY = tableEndY + 5;
        measurementGuide.forEach(line => {
          doc.text('• ' + line, margin, lineY);
          lineY += 4;
        });
      }
      
      // Add manufacturing notes at the bottom of the page
      const notesY = doc.internal.pageSize.height - 50;
      doc.setFontSize(subheaderStyle.fontSize - 1);
      doc.setFont(subheaderStyle.font, subheaderStyle.style);
      doc.text("MANUFACTURING NOTES", pageWidth / 2, notesY, { align: 'center' });
      
      const manufacturingNotes = [
        "1. All measurements are in centimeters unless otherwise specified.",
        "2. Refer to attached swatches for exact color matching.",
        "3. Textures should be applied as shown in visualization.",
        "4. Seam allowance is 1cm for all edges unless specified otherwise."
      ].join(" ");
      
      doc.setFontSize(textStyle.fontSize);
      doc.setFont(textStyle.font, textStyle.style);
      doc.text(manufacturingNotes, margin, notesY + 8, { 
        maxWidth: contentWidth,
        align: 'left' 
      });
      
      // Save the PDF with a more descriptive name
      const modelName = modelData.name || selectedModel;
      doc.save(`${modelName}_TechPack_${styleDate.replace(/\//g, '-')}.pdf`);
      
    } catch (error) {
      logError('Error generating techpack:', error);
      alert('Error generating techpack. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Get model callouts based on model type
  const getModelCallouts = (modelType) => {
    // Default callouts for all model types
    const baseCallouts = [
      {
        text: "FRONT & BACK IN MAIN FABRIC",
        position: { x: 0.5, y: 0.5 },
        lineOffset: { x: 70, y: 0 }
      }
    ];
    
    // Model-specific callouts
    const modelCallouts = {
      'men_polo_hs': [
        {
          text: "ROUND COLLAR IN MAIN FABRIC",
          position: { x: 0.5, y: 0.15 },
          lineOffset: { x: -70, y: 0 }
        },
        {
          text: "SLEEVE IN MAIN FABRIC",
          position: { x: 0.25, y: 0.3 },
          lineOffset: { x: -70, y: 0 }
        },
        {
          text: "OPEN CUFF",
          position: { x: 0.25, y: 0.35 },
          lineOffset: { x: -70, y: 10 }
        },
        {
          text: "PRINTED BRAND LABEL",
          position: { x: 0.5, y: 0.18 },
          lineOffset: { x: 0, y: -20 }
        },
        {
          text: "OPEN BOTTOM",
          position: { x: 0.5, y: 0.7 },
          lineOffset: { x: 0, y: 20 }
        }
      ],
      'men_round_hs': [
        {
          text: "NECK TAPE IN MAIN FABRIC",
          position: { x: 0.5, y: 0.15 },
          lineOffset: { x: 70, y: 0 }
        },
        {
          text: "SLEEVE IN MAIN FABRIC",
          position: { x: 0.25, y: 0.3 },
          lineOffset: { x: -70, y: 0 }
        },
        {
          text: "OPEN SLEEVE EDGE",
          position: { x: 0.25, y: 0.35 },
          lineOffset: { x: -70, y: 10 }
        },
        {
          text: "PRINT LOGO ON CHEST",
          position: { x: 0.5, y: 0.3 },
          lineOffset: { x: 0, y: -20 }
        },
        {
          text: "OPEN BOTTOM",
          position: { x: 0.5, y: 0.7 },
          lineOffset: { x: 0, y: 20 }
        }
      ],
      'men_hoodie': [
        {
          text: "HOOD IN MAIN FABRIC",
          position: { x: 0.5, y: 0.1 },
          lineOffset: { x: 70, y: 0 }
        },
        {
          text: "SLEEVE IN MAIN FABRIC",
          position: { x: 0.25, y: 0.3 },
          lineOffset: { x: -70, y: 0 }
        },
        {
          text: "ZIPPER CLOSURE",
          position: { x: 0.5, y: 0.4 },
          lineOffset: { x: 70, y: 0 }
        },
        {
          text: "POCKET",
          position: { x: 0.3, y: 0.5 },
          lineOffset: { x: -60, y: 0 }
        },
        {
          text: "RIBBED CUFF",
          position: { x: 0.25, y: 0.6 },
          lineOffset: { x: -70, y: 10 }
        },
        {
          text: "RIBBED HEM",
          position: { x: 0.5, y: 0.7 },
          lineOffset: { x: 0, y: 20 }
        }
      ]
    };
    
    // Return model-specific callouts or default ones
    return modelCallouts[modelType] || baseCallouts;
  };
  
  // Extract color data from the scene
  const extractColorData = () => {
    const colorData = [];
    const processedColors = new Set();
    
    // Traverse the scene to find all meshes with materials
    scene.traverse(object => {
      if (object.isMesh && object.material && !object.name.includes('tex') && object.userData.isImported) {
        if (object.material.color) {
          const hex = '#' + object.material.color.getHexString();
          
          // Skip duplicate colors
          if (!processedColors.has(hex)) {
            processedColors.add(hex);
            
            colorData.push({
              name: formatPartName(object.name),
              hex: hex,
              rgb: {
                r: Math.round(object.material.color.r * 255),
                g: Math.round(object.material.color.g * 255),
                b: Math.round(object.material.color.b * 255)
              }
            });
          }
        }
      }
    });
    
    return colorData;
  };
  
  // Format part name for display
  const formatPartName = (name) => {
    // Remove any numbers or special characters
    let formatted = name.replace(/[0-9_]/g, ' ');
    
    // Split by capital letters and join with spaces
    formatted = formatted.replace(/([A-Z])/g, ' $1');
    
    // Clean up extra spaces
    formatted = formatted.replace(/\s+/g, ' ').trim();
    
    // Capitalize first letter of each word
    return formatted.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };
  
  // Get measurement data for the current model
  const getMeasurementData = () => {
    // These would normally come from a database or configuration
    const measurementsByModel = {
      men_polo_hs: {
        sizes: ['S', 'M', 'L', 'XL', 'XXL'],
        measurements: {
          'Chest Width': [52, 55, 58, 61, 64],
          'Length': [70, 72, 74, 76, 78],
          'Shoulder Width': [44, 46, 48, 50, 52],
          'Sleeve Length': [20, 21, 22, 23, 24]
        }
      },
      men_round_hs: {
        sizes: ['S', 'M', 'L', 'XL', 'XXL'],
        measurements: {
          'Chest Width': [50, 53, 56, 59, 62],
          'Length': [69, 71, 73, 75, 77],
          'Shoulder Width': [43, 45, 47, 49, 51],
          'Sleeve Length': [19, 20, 21, 22, 23]
        }
      },
      men_hoodie: {
        sizes: ['S', 'M', 'L', 'XL', 'XXL'],
        measurements: {
          'Chest Width': [55, 58, 61, 64, 67],
          'Length': [71, 73, 75, 77, 79],
          'Shoulder Width': [47, 49, 51, 53, 55],
          'Sleeve Length': [62, 64, 66, 68, 70],
          'Hood Length': [32, 34, 35, 36, 37]
        }
      },
      women_polo_hs: {
        sizes: ['XS', 'S', 'M', 'L', 'XL'],
        measurements: {
          'Chest Width': [45, 48, 51, 54, 57],
          'Length': [64, 66, 68, 70, 72],
          'Shoulder Width': [38, 40, 42, 44, 46],
          'Sleeve Length': [17, 18, 19, 20, 21]
        }
      }
      // Add other models as needed
    };
    
    return measurementsByModel[selectedModel] || null;
  };
  
  return (
    <div className="mt-6 border-t border-gray-700 pt-6">
      {/* Use the improved ModifiedMultiViewCapture for better zoomed-in captures first */}
      <ModifiedMultiViewCapture 
        ref={multiViewRef}
        scene={scene}
        camera={camera}
        renderer={renderer}
        controls={controls}
      />

      {/* Collapsible TechPack Section */}
      <div className="mt-8 border-t border-gray-700 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileDown className="w-4 h-4" /> Technical Package
          </h3>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded-full hover:bg-gray-700"
          >
            {isExpanded ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </button>
        </div>
        
        <button
          onClick={generateTechPack}
          disabled={isGenerating}
          className="w-full flex items-center justify-center gap-2 p-2 bg-blue-600 hover:bg-blue-700
                  text-white rounded-lg transition-colors disabled:opacity-50 disabled:bg-blue-800"
        >
          {isGenerating ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              Generating Techpack...
            </>
          ) : (
            <>
              <FileDown className="w-4 h-4" />
              Generate Techpack PDF
            </>
          )}
        </button>

        {isExpanded && (
          <div className="mt-4 space-y-4">
            <p className="text-xs text-gray-400">
              First capture views, then generate your technical package PDF with all customizations.
            </p>
            
            {/* Display captured views */}
            {multiViewRef.current && multiViewRef.current.captures && multiViewRef.current.captures.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium mb-3">Captured Views</h4>
                <div className="grid grid-cols-2 gap-2">
                  {multiViewRef.current.captures.map((capture, index) => (
                    <div key={index} className="bg-gray-800 rounded overflow-hidden">
                      <div className="p-2 border-b border-gray-700 flex justify-between items-center">
                        <span className="text-sm">{capture.name}</span>
                        <a 
                          href={capture.url}
                          download={`${selectedModel}_${capture.name.toLowerCase()}.jpg`}
                          className="p-1 hover:bg-gray-700 rounded"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      </div>
                      <div className="p-2 bg-gray-700 bg-opacity-50 flex justify-center items-center">
                        <img 
                          src={capture.url} 
                          alt={`${capture.name} view`} 
                          className="w-full h-auto rounded"
                          style={{ objectFit: 'contain', maxHeight: '200px' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Material and Color Specifications */}
            {scene && (
              <MaterialSpecs 
                scene={scene}
                selectedMaterial={selectedMaterial}
              />
            )}
            
            {/* Measurements Table */}
            <MeasurementsTable 
              selectedModel={selectedModel}
            />
            
            {/* Quick access to construction details */}
            <div className="p-4 bg-gray-800 rounded-lg">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <ScissorsSquare className="w-4 h-4" /> Construction Details
              </h4>
              <div className="space-y-2 text-sm">
                {seamSpecifications[selectedModel]?.map((seam, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span>{seam.name}</span>
                    <span className="text-gray-400">{seam.location}</span>
                  </div>
                ))}
                {trimSpecifications[selectedModel]?.map((trim, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span>{trim.type}: {trim.description}</span>
                    <span className="text-gray-400">{trim.location}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TechPack;