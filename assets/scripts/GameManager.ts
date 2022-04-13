
import { _decorator, Component, Node, director, CCInteger} from 'cc';
import { GameResult } from './enums/GameResult.enum';
import { GameResultManager } from './GameResultManager';
import { GameState } from './enums/GameState.enum';
import { getRandomEnum } from './utils/getRandomEnum';
import { shuffle } from './utils/shuffle';
import { TileColor } from './enums/TileColor.enum';
import { TileController } from './TileController';
import { TileFactory } from './TileFactory';
import { TileProps } from './types/TileProps.type';
import { Bonus } from './enums/Bonus';
import { GameUIManager } from './GameUIManager';
const { ccclass, property } = _decorator;

const DEFAULT_COLUMNS = 9;
const DEFAULT_ROWS = 9;
const DEFAULT_MAX_COLORS = 5;
const DEFAULT_GOAL_SCORE = 1000;
const DEFAULT_REMAIN_MOVES = 50;
const DEFAULT_SIBLINGS_TO_DESTROY = 2;
const DEFAULT_MAX_SHUFFLES = 5;
const DEFAULT_BONUS_BOMB_RADIUS = 2;
const SHUFFLE_TIMEOUT_MS = 500;

@ccclass('GameManager')
export class GameManager extends Component {
    @property({group: {name: 'GameSettings'}, type: CCInteger})
    public columns: number = DEFAULT_COLUMNS;
    @property({group: {name: 'GameSettings'}, type: CCInteger})
    public rows: number = DEFAULT_ROWS;
    @property({group: {name: 'GameSettings'}, type: CCInteger})
    public maxColors: number = DEFAULT_MAX_COLORS;
    @property({group: {name: 'GameSettings'}, type: CCInteger})
    public siblingsToDestroy: number = DEFAULT_SIBLINGS_TO_DESTROY;
    @property({group: {name: 'GameSettings'}, type: CCInteger})
    public maxShufflesUntilFail = DEFAULT_MAX_SHUFFLES;
    @property({group: {name: 'GameSettings'}, type: CCInteger})
    public goalScore: number = DEFAULT_GOAL_SCORE;
    @property({group: {name: 'GameSettings'}, type: CCInteger})
    public remainMoves: number = DEFAULT_REMAIN_MOVES;
    @property({group: {name: 'GameSettings'}, type: CCInteger})
    public bonusBombRadius: number = DEFAULT_BONUS_BOMB_RADIUS;

    @property({group: {name: 'Nodes'}, type: Node})
    public fieldSpawnNode: Node;
    @property({group: {name: 'Nodes'}, type: Node})
    public gameResultManagerNode: Node;
    
    private _currentScore: number = 0;
    private _tiles: Node[][] = [];
    private _gameState: GameState = GameState.Playing
    private _activeBonus: Bonus | null = null;
    private _teleportBonusLobby: Node | null;

    private _gameUIManager: GameUIManager;
    private _gameResultManager: GameResultManager;

    start () {
        this._gameUIManager = this.getComponent(GameUIManager);
        this._gameResultManager = this.gameResultManagerNode.getComponent(GameResultManager);

        this._gameUIManager.calculateTileDimensions(this.rows, this.columns);
        this._updateGameInfo();
        this._initField();
        this._checkIfCanDoMoveOrShuffle();
        this._initButtonHandlers();
    }

    private _initButtonHandlers() {
        this._gameUIManager.initButtonHandlers(this._onBonusButtonClick.bind(this));
    }

    private _onBonusButtonClick(bonus: Bonus) {
        this._chooseBonus(bonus);
        this._updateBonusButtonsUI();
    }

    private _chooseBonus(bonus: Bonus) {
        const isBonusApplying = this._gameState === GameState.BonusApplying;
        if (!isBonusApplying) {
            this._activeBonus = bonus;
            this._gameState = GameState.BonusApplying;
            return;
        }

        const isCurrentBonusActive = this._activeBonus === bonus;
        if (isCurrentBonusActive) {
            if (bonus === Bonus.Teleport && this._teleportBonusLobby) {
                this._restoreTileColor(this._teleportBonusLobby);
                this._teleportBonusLobby = null;
            }
            this._activeBonus = null;
            this._gameState = GameState.Playing;
        }
    }

    private _clearBonus() {
        this._gameState = GameState.Playing;
        this._activeBonus = null;
        this._updateBonusButtonsUI();
    }

    private _checkIfCanDoMoveOrShuffle(attempts = this.maxShufflesUntilFail) {
        if (this._currentScore >= this.goalScore || this.remainMoves <= 0) {
            return;
        }
        setTimeout(() => {
            if (this._canDoMove()) {
                return;
            }
            if (attempts <= 0) {
                this._gameState = GameState.NoMoreAttempts;
                return;
            }
            this._shuffle();
            this._updateCellsPosition();
            this._checkIfCanDoMoveOrShuffle(attempts - 1);
        }, SHUFFLE_TIMEOUT_MS);
    }

    private _canDoMove() {
        for (let row = 0; row < this._tiles.length; row++) {
            for (let column = 0; column < this._tiles[0].length; column++) {
                const tile = this._tiles[row][column];
                const color = tile.getComponent(TileController).color;
                const allEqualTiles = this._getAllEqualTiles(row, column, color);

                if (allEqualTiles.size >= this.siblingsToDestroy) {
                    return true;
                }
            }
        }

        return false;
    }

    private _getAllEqualTiles(row: number, column: number, color: TileColor) {
        const allEqualTiles = new Set<Node>();
        const way = new Set<Node>();
        this._getAllSiblings(row, column, allEqualTiles, color, way);

        return allEqualTiles;
    }

    private _initField() {
        // Заполняем поле
        for(let column = 0; column < this.columns; column++) {
            for(let row = 0; row < this.rows; row++) {
                const colorEnum = getRandomEnum(TileColor, this.maxColors);
                const tile = this._createTile({
                    width: this._gameUIManager.tileWidth,
                    height: this._gameUIManager.tileHeight,
                    color: colorEnum,
                    x: this._gameUIManager.calculateX(column),
                    y: this._gameUIManager.calculateY(row),
                    row,
                    column
                });

                tile.on(Node.EventType.MOUSE_DOWN, () => {
                    this._onTileClick(tile);
                });

                if (this._tiles[row]) {
                    this._tiles[row].push(tile);
                } else {
                    this._tiles[row] = [tile];
                }
            }
        }
    }

    private _onTileClick(tile: Node) {
        if (this._activeBonus === Bonus.Bomb) {
            this._processBombBonus(tile);
            return;
        }

        if (this._activeBonus === Bonus.Teleport) {
            this._processTeleportBonus(tile);
            return;
        }
        
        this._processBlast(tile);
    }

    private _processBlast(tile: Node) {
        const { row, column, color } = tile.getComponent(TileController);
        const allEqualTiles = this._getAllEqualTiles(row, column, color);
        const isCanBlast = allEqualTiles.size >= this.siblingsToDestroy;

        if (isCanBlast) {
            allEqualTiles.forEach((tile) => {
                const tileController = tile.getComponent(TileController);
                const { row, column } = tileController;
                tileController.destroyTile();
                this._tiles[row][column] = null;
            });
            this._currentScore += Math.min(2 ** allEqualTiles.size, 250);;
            this.remainMoves -= 1;
            this._updateGameInfo();

            this._fillEmptyCells();
            this._updateCellsPosition();
            this._checkIfCanDoMoveOrShuffle();
        }
    }

    private _processBombBonus(tile: Node) {
        const tilesToDestroy = this._getTilesForBombBlast(tile);
        tilesToDestroy.forEach((tile) => {
            const tileController = tile.getComponent(TileController);
            const { row, column } = tileController;
            tileController.destroyTile();
            this._tiles[row][column] = null;
        });
        this._clearBonus();

        this._currentScore += Math.min(2 ** tilesToDestroy.length, 250);
        this.remainMoves -= 1;
        this._updateGameInfo();

        this._fillEmptyCells();
        this._updateCellsPosition();
        this._checkIfCanDoMoveOrShuffle();
    }

    private _processTeleportBonus(tile: Node) {
        if (this._teleportBonusLobby === tile) {
            this._restoreTileColor(tile);
            this._teleportBonusLobby = null;
            return;
        }

        if (this._teleportBonusLobby) {
            const {row: row1, column: col1} = tile.getComponent(TileController);
            this._restoreTileColor(this._teleportBonusLobby);
            const {row: row2, column: col2} = this._teleportBonusLobby.getComponent(TileController);

            this._tiles[row1][col1] = this._teleportBonusLobby;
            const tile1 = this._tiles[row1][col1].getComponent(TileController);
            tile1.row = row1;
            tile1.column = col1;

            this._tiles[row2][col2] = tile;
            const tile2 = this._tiles[row2][col2].getComponent(TileController);
            tile2.row = row2;
            tile2.column = col2;

            this._teleportBonusLobby = null;
            this.remainMoves -= 1;
            this._updateCellsPosition();
            this._clearBonus();
            this._updateGameInfo();
            this._checkIfCanDoMoveOrShuffle();
            return;
        }

        this._teleportBonusLobby = tile;
        this._makeTileDarker(tile);
    }

    private _getTilesForBombBlast(tile: Node) {
        if (this.bonusBombRadius < 1) {
            return [tile];
        }
        const tilesForBombBlast = [];

        const tileController = tile.getComponent(TileController);
        const {row, column} = tileController;
        const radius = this.bonusBombRadius;

        for (let r = row - radius, endRow = row + radius; r <= endRow; r++) {
            for (let c = column - radius, endCol = column + radius; c <= endCol; c++) {
                const tile = this._tiles?.[r]?.[c];
                if (tile) {
                    tilesForBombBlast.push(tile);
                }
            }
        }

        return tilesForBombBlast;
    }

    private _fillEmptyCells() {
        for (let column = 0; column < this._tiles[0].length; column++) {
            for (let row = this.rows - 1; row >= 0; row--) {
                const tile = this._tiles[row][column];
                if (!tile) {
                    let top = row - 1;
                    while (top >= 0 && !this._tiles[top][column]) {
                        top--;
                    }
                    if (top < 0 || !this._tiles[top][column]) {
                        // создаём tile
                        const colorEnum = getRandomEnum(TileColor, this.maxColors);
                        const tile = this._createTile({
                            width: this._gameUIManager.tileWidth,
                            height: this._gameUIManager.tileHeight,
                            color: colorEnum,
                            x: this._gameUIManager.calculateX(column),
                            y: this._gameUIManager.calculateY(row),
                            row,
                            column
                        });

                        this._tiles[row][column] = tile;

                        tile.on(Node.EventType.MOUSE_DOWN, () => {
                            this._onTileClick(tile);
                        });
                    } else {
                        // меняем местами
                        this._tiles[row][column] = this._tiles[top][column];
                        const tileController = this._tiles[row][column].getComponent(TileController);
                        tileController.row = row;
                        tileController.column = column;
                        this._tiles[top][column] = null;
                    }
                }
            }
        }
    }

    update() {
        if (this._gameState === GameState.End) {
            return;
        }

        if (this._isWon()) {
            this._gameState = GameState.End;
            this._setGameResult(GameResult.WIN);
            director.loadScene('endGame');
        } else if (this._isLoose()) {
            this._setGameResult(GameResult.LOSE);
            this._gameState = GameState.End;
            director.loadScene('endGame');
        }
    }

    private _updateCellsPosition() {
        this._gameUIManager.updateCellsPosition(this._tiles);
    }

    private _shuffle() {
        let array = [];
        for (let row = 0; row < this._tiles.length; row++) {
            array = array.concat(this._tiles[row]);
        }
        shuffle(array);
        const shuffledTiles = array;

        for (let i = 0, row = 0; row < this._tiles.length; row++) {
            for (let column = 0; column < this._tiles[0].length; column++, i++) {
                this._tiles[row][column] = shuffledTiles[i];
                const tileController = this._tiles[row][column].getComponent(TileController);
                tileController.row = row;
                tileController.column = column;
            }
        }
    }

    private _getAllSiblings(
        row: number,
        column: number,
        allEqualTiles: Set<Node>,
        color: TileColor,
        way: Set<Node>
    ) {
        // Если вышли за границы, то выходим
        if (row < 0 || row >= this.rows || column < 0 || column >= this.columns) {
            return;
        }

        const tile = this._tiles[row][column];
        // Если мы уже были на этом тайле, то выходим
        if (way.has(tile)) {
            return;
        }

        const tileColor = tile.getComponent(TileController).color;
        // Если цвет не совпадает, выходим
        if (tileColor !== color) {
            return;
        }

        allEqualTiles.add(tile);
        way.add(tile);

        this._getAllSiblings(row - 1, column, allEqualTiles, color, way);
        this._getAllSiblings(row + 1, column, allEqualTiles, color, way);
        this._getAllSiblings(row, column - 1, allEqualTiles, color, way);
        this._getAllSiblings(row, column + 1, allEqualTiles, color, way);
    }

    private _createTile({width, height, color, x, y, row, column}: TileProps) {
        const tile = this.getComponent(TileFactory).createTile({width, height, color, x, y, row, column});
        tile.parent = this.fieldSpawnNode;
        return tile;
    }

    private _isWon() {
        return this._currentScore >= this.goalScore;
    }

    private _isLoose() {
        return this._gameState === GameState.NoMoreAttempts || !this._hasMoves();
    }

    private _hasMoves() {
        return this.remainMoves > 0;
    }

    private _setGameResult(gameResult: GameResult) {
        this._gameResultManager.gameResult = gameResult;
    }

    private _updateGameInfo() {
        let progress = this._currentScore / this.goalScore;
        progress = progress > 1 ? 1 : progress;
        this._gameUIManager.updateGameInfo(this.remainMoves, this._currentScore, progress)
    }
    
    private _updateBonusButtonsUI() {
        this._gameUIManager.updateBonusButtonsUI(this._gameState, this._activeBonus);
    }

    private _restoreTileColor(tile: Node) {
        this._gameUIManager.restoreTileColor(tile);
    }

    private _makeTileDarker(tile: Node) {
        this._gameUIManager.makeTileDarker(tile);
    }
}
