import { TileColor } from '../enums/TileColor.enum';

export type TileProps = {
    width: number;
    height: number;
    color: TileColor;
    x: number;
    y: number;
    row: number;
    column: number;
};
