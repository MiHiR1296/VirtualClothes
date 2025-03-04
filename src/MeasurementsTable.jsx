import React from 'react';
import { Ruler } from 'lucide-react';

const MeasurementsTable = ({ selectedModel }) => {
  // These would normally come from a database or configuration
  // For now, we'll use hardcoded measurements for demo purposes
  const getMeasurements = () => {
    // Measurements in cm for different models
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
      men_jacket: {
        sizes: ['S', 'M', 'L', 'XL', 'XXL'],
        measurements: {
          'Chest Width': [56, 59, 62, 65, 68],
          'Length': [72, 74, 76, 78, 80],
          'Shoulder Width': [48, 50, 52, 54, 56],
          'Sleeve Length': [63, 65, 67, 69, 71]
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
      },
      women_round_hs: {
        sizes: ['XS', 'S', 'M', 'L', 'XL'],
        measurements: {
          'Chest Width': [43, 46, 49, 52, 55],
          'Length': [63, 65, 67, 69, 71],
          'Shoulder Width': [37, 39, 41, 43, 45],
          'Sleeve Length': [16, 17, 18, 19, 20]
        }
      }
    };
    
    // Return measurements for the selected model, or default if not found
    return measurementsByModel[selectedModel] || {
      sizes: ['S', 'M', 'L', 'XL'],
      measurements: {
        'Chest Width': [50, 53, 56, 59],
        'Length': [70, 72, 74, 76],
        'Shoulder Width': [44, 46, 48, 50],
        'Sleeve Length': [20, 21, 22, 23]
      }
    };
  };
  
  const modelMeasurements = getMeasurements();
  
  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <Ruler className="w-4 h-4" /> Size Specifications
      </h3>
      
      <div className="overflow-x-auto bg-gray-800 rounded-lg p-3">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left py-2 px-3">Measurement</th>
              {modelMeasurements.sizes.map(size => (
                <th key={size} className="text-center py-2 px-3">{size}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(modelMeasurements.measurements).map(([name, values], index) => (
              <tr key={name} className={index % 2 === 0 ? "bg-gray-800" : "bg-gray-750"}>
                <td className="py-2 px-3 font-medium">{name} (cm)</td>
                {values.map((value, i) => (
                  <td key={i} className="text-center py-2 px-3">{value}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="mt-4 bg-gray-800 rounded-lg p-4">
        <h4 className="font-medium mb-2">Measurement Guide</h4>
        <ul className="list-disc pl-5 text-sm space-y-1 text-gray-300">
          <li><span className="font-medium">Chest Width:</span> Measured across the chest at the widest point</li>
          <li><span className="font-medium">Length:</span> Measured from highest point of shoulder to bottom hem</li>
          <li><span className="font-medium">Shoulder Width:</span> Measured from shoulder seam to shoulder seam</li>
          <li><span className="font-medium">Sleeve Length:</span> Measured from shoulder seam to end of sleeve</li>
          {selectedModel.includes('hoodie') && (
            <li><span className="font-medium">Hood Length:</span> Measured from hood seam to the top</li>
          )}
        </ul>
      </div>
      
      <p className="text-xs text-gray-400 mt-2">
        All measurements are in centimeters and may vary slightly from the actual product by ±1-2cm.
      </p>
    </div>
  );
};

export default MeasurementsTable;
