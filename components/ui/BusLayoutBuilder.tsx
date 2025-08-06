import React, { useState, useEffect } from "react";
import { Button } from "./button";
import { Label } from "./label";
import { Plus, Minus, RotateCcw, Car } from "lucide-react";
import { SeatLayoutJson, Seat } from "../../shared/types";

interface BusLayoutBuilderProps {
  totalSeats: number;
  onLayoutChange: (seats: Seat[], seatLayout: SeatLayoutJson) => void;
  initialLayout?: SeatLayoutJson;
  initialSeats?: Seat[];
}

const BusLayoutBuilder: React.FC<BusLayoutBuilderProps> = ({
  totalSeats,
  onLayoutChange,
  initialLayout,
  initialSeats,
}) => {
  const [rows, setRows] = useState(
    initialLayout?.rows || Math.ceil(totalSeats / 4)
  );
  const [arrangement, setArrangement] = useState<string[][]>(
    initialLayout?.arrangement || []
  );
  const [seats, setSeats] = useState<Seat[]>(initialSeats || []);
  const [draggedSeat, setDraggedSeat] = useState<string | null>(null);

  // Initialize arrangement if empty
  useEffect(() => {
    if (arrangement.length === 0 && totalSeats > 0) {
      initializeLayout();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalSeats]);

  // Update seats when arrangement changes
  useEffect(() => {
    updateSeatsFromArrangement();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arrangement]);

  const initializeLayout = () => {
    const newRows = Math.ceil(totalSeats / 4);
    const newArrangement: string[][] = [];
    let seatIndex = 1;

    for (let row = 0; row < newRows; row++) {
      const rowSeats: string[] = [];
      const seatsInThisRow = Math.min(4, totalSeats - row * 4);

      for (let col = 0; col < 6; col++) {
        // Start with 6 columns (4 seats + 2 potential aisles)
        if (col === 2) {
          // Default aisle in the middle
          rowSeats.push("");
        } else if (
          seatIndex <= totalSeats &&
          rowSeats.filter((s) => s !== "").length < seatsInThisRow
        ) {
          const seatNumber = `${String(row + 1).padStart(
            2,
            "0"
          )}${String.fromCharCode(
            65 + rowSeats.filter((s) => s !== "").length
          )}`;
          rowSeats.push(seatNumber);
          seatIndex++;
        } else {
          rowSeats.push("");
        }
      }
      newArrangement.push(rowSeats);
    }

    setRows(newRows);
    setArrangement(newArrangement);
  };

  const updateSeatsFromArrangement = () => {
    const newSeats: Seat[] = [];
    arrangement.forEach((row) => {
      row.forEach((seatId) => {
        if (seatId !== "") {
          const existingSeat = seats.find((s) => s.id === seatId);
          newSeats.push({
            id: seatId,
            number: seatId,
            isAvailable: existingSeat?.isAvailable ?? true,
            isSelected: false,
            type: "regular",
            price: 0,
          });
        }
      });
    });

    setSeats(newSeats);

    // Calculate dynamic columns based on the longest row
    const maxColumns = Math.max(...arrangement.map((row) => row.length), 1);

    const seatLayout: SeatLayoutJson = {
      rows: arrangement.length,
      columns: maxColumns,
      arrangement: arrangement,
    };

    onLayoutChange(newSeats, seatLayout);
  };

  const addRow = () => {
    const newArrangement = [...arrangement];
    const maxColumns = Math.max(...arrangement.map((row) => row.length), 4);
    const emptyRow = new Array(maxColumns).fill("");
    newArrangement.push(emptyRow);
    setArrangement(newArrangement);
    setRows(rows + 1);
  };

  const removeRow = (rowIndex: number) => {
    if (arrangement.length <= 1) return;
    const newArrangement = arrangement.filter((_, index) => index !== rowIndex);
    setArrangement(newArrangement);
    setRows(rows - 1);
  };

  const addColumn = (rowIndex: number, colIndex: number) => {
    const newArrangement = [...arrangement];
    newArrangement[rowIndex].splice(colIndex, 0, "");
    setArrangement(newArrangement);
  };

  const removeColumn = (rowIndex: number, colIndex: number) => {
    if (arrangement[rowIndex].length <= 1) return;
    const newArrangement = [...arrangement];
    newArrangement[rowIndex].splice(colIndex, 1);
    setArrangement(newArrangement);
  };

  const toggleCell = (rowIndex: number, colIndex: number) => {
    const newArrangement = [...arrangement];
    const currentValue = newArrangement[rowIndex][colIndex];

    if (currentValue === "") {
      // Add a seat - find the next available seat number
      const existingSeats = arrangement.flat().filter((s) => s !== "");
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const usedNumbers = new Set(
        existingSeats.map((s) => s.match(/\d+/)?.[0]).filter(Boolean)
      );

      const seatRow = rowIndex + 1;
      let seatCol = "A";

      // Find the next available seat letter for this row
      const seatsInRow = newArrangement[rowIndex].filter((s) => s !== "");
      seatCol = String.fromCharCode(65 + seatsInRow.length);

      const seatNumber = `${String(seatRow).padStart(2, "0")}${seatCol}`;
      newArrangement[rowIndex][colIndex] = seatNumber;
    } else {
      // Remove seat (make it an aisle/empty)
      newArrangement[rowIndex][colIndex] = "";
    }

    setArrangement(newArrangement);
  };

  const onDragStart = (e: React.DragEvent, seatId: string) => {
    setDraggedSeat(seatId);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const onDrop = (e: React.DragEvent, rowIndex: number, colIndex: number) => {
    e.preventDefault();
    if (!draggedSeat) return;

    const newArrangement = [...arrangement];

    // Find and remove the dragged seat from its current position
    for (let r = 0; r < newArrangement.length; r++) {
      for (let c = 0; c < newArrangement[r].length; c++) {
        if (newArrangement[r][c] === draggedSeat) {
          newArrangement[r][c] = "";
          break;
        }
      }
    }

    // Place the seat in the new position
    newArrangement[rowIndex][colIndex] = draggedSeat;
    setArrangement(newArrangement);
    setDraggedSeat(null);
  };

  const resetLayout = () => {
    setArrangement([]);
    initializeLayout();
  };

  const toggleSeatAvailability = (seatId: string) => {
    const newSeats = seats.map((seat) =>
      seat.id === seatId ? { ...seat, isAvailable: !seat.isAvailable } : seat
    );
    setSeats(newSeats);

    // Update the layout with new seat states
    const maxColumns = Math.max(...arrangement.map((row) => row.length), 1);
    const seatLayout: SeatLayoutJson = {
      rows: arrangement.length,
      columns: maxColumns,
      arrangement: arrangement,
    };
    onLayoutChange(newSeats, seatLayout);
  };

  const getCurrentSeatCount = () => {
    return arrangement.flat().filter((cell) => cell !== "").length;
  };

  const getSeatStatus = (seatId: string) => {
    const seat = seats.find((s) => s.id === seatId);
    return seat?.isAvailable ?? true;
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2">
          <Label>
            Seats: {getCurrentSeatCount()}/{totalSeats}
          </Label>
          <div
            className={`px-2 py-1 rounded text-sm ${
              getCurrentSeatCount() === totalSeats
                ? "bg-green-100 text-green-800"
                : "bg-orange-100 text-orange-800"
            }`}
          >
            {getCurrentSeatCount() === totalSeats ? "Complete" : "Incomplete"}
          </div>
        </div>
        <Button onClick={addRow} size="sm" variant="outline" type="button">
          <Plus className="w-4 h-4 mr-1" />
          Add Row
        </Button>
        <Button onClick={resetLayout} size="sm" variant="outline" type="button">
          <RotateCcw className="w-4 h-4 mr-1" />
          Reset
        </Button>
      </div>

      {/* Instructions */}
      <div className="text-sm text-gray-600 space-y-1">
        <p>• Click empty spaces to add seats, click seats to remove them</p>
        <p>• Drag seats to rearrange them</p>
        <p>• Use + buttons to add columns, - buttons to remove columns</p>
        <p>• Use the X button to remove entire rows</p>
        <p>• Empty spaces automatically become aisles</p>
      </div>

      {/* Bus Layout */}
      <div className="bg-white border-2 border-gray-200 rounded-xl p-6 mx-auto max-w-[600px]">
        {/* Driver Section */}
        <div className="text-center mb-6 pb-4 border-b border-gray-200">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Car className="w-6 h-6 text-gray-600" />
            {/* <div className="w-16 h-8 bg-gray-800 rounded"></div> */}
          </div>
          <span className="text-xs text-gray-600">Driver</span>
        </div>

        {/* Seat Grid */}
        <div className="space-y-3">
          {arrangement.map((row, rowIndex) => (
            <div key={rowIndex} className="space-y-2">
              {/* Row Controls */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 font-medium">
                  Row {rowIndex + 1}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => addColumn(rowIndex, row.length)}
                    className="h-6 px-2"
                    type="button"
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                  {arrangement.length > 1 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeRow(rowIndex)}
                      className="h-6 px-2 text-red-600 hover:text-red-700"
                      type="button"
                    >
                      ×
                    </Button>
                  )}
                </div>
              </div>

              {/* Row Seats */}
              <div className="flex items-center justify-center gap-2 flex-wrap">
                {row.map((cell, colIndex) => (
                  <div
                    key={colIndex}
                    className="flex flex-col items-center gap-1"
                  >
                    {cell === "" ? (
                      // Empty cell / Aisle
                      <div
                        className="w-12 h-12 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
                        onClick={() => toggleCell(rowIndex, colIndex)}
                        onDragOver={onDragOver}
                        onDrop={(e) => onDrop(e, rowIndex, colIndex)}
                      >
                        <Plus className="w-4 h-4 text-gray-400" />
                      </div>
                    ) : (
                      // Seat
                      <div
                        className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center text-xs font-medium cursor-pointer transition-all ${
                          getSeatStatus(cell)
                            ? "bg-green-50 border-green-300 hover:bg-green-100 text-green-800"
                            : "bg-red-50 border-red-300 hover:bg-red-100 text-red-800"
                        }`}
                        draggable
                        onDragStart={(e) => onDragStart(e, cell)}
                        onDragOver={onDragOver}
                        onDrop={(e) => onDrop(e, rowIndex, colIndex)}
                        onClick={() => toggleCell(rowIndex, colIndex)}
                      >
                        {cell}
                      </div>
                    )}

                    {/* Column Controls */}
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => addColumn(rowIndex, colIndex)}
                        className="h-4 w-4 p-0"
                        type="button"
                      >
                        <Plus className="w-2 h-2" />
                      </Button>
                      {row.length > 1 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeColumn(rowIndex, colIndex)}
                          className="h-4 w-4 p-0 text-red-600"
                          type="button"
                        >
                          <Minus className="w-2 h-2" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Seat Status Toggle */}
        {getCurrentSeatCount() > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <Label className="text-sm font-medium mb-3 block">
              Seat Availability (Click to toggle)
            </Label>
            <div className="flex flex-wrap gap-2">
              {seats.map((seat) => (
                <button
                  key={seat.id}
                  onClick={() => toggleSeatAvailability(seat.id)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    seat.isAvailable
                      ? "bg-green-100 text-green-800 hover:bg-green-200"
                      : "bg-red-100 text-red-800 hover:bg-red-200"
                  }`}
                >
                  {seat.number} {seat.isAvailable ? "✓" : "✗"}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="mt-6 pt-4 border-t border-gray-200 flex items-center justify-center gap-6 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-50 border border-green-300 rounded"></div>
            <span>Available Seat</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-50 border border-red-300 rounded"></div>
            <span>Unavailable Seat</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-dashed border-gray-300 rounded"></div>
            <span>Aisle/Empty</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusLayoutBuilder;
