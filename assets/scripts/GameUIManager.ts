
import { _decorator, Component, Node, SpriteComponent, Color, LabelComponent, ProgressBarComponent, tween, UITransformComponent, Vec3 } from 'cc';
import { Bonus } from './enums/Bonus';
import { GameState } from './enums/GameState.enum';
const { ccclass, property } = _decorator;

const COLOR_ACTIVE_BUTTON = new Color(255, 25, 100);
const COLOR_DEFAULT = new Color(255, 255, 255);
const COLOR_DARK_TILE = new Color(125, 125, 125);
const TILE_RATIO = 1.1228070175438596;

@ccclass('GameUIManager')
export class GameUIManager extends Component {
    @property({group: {name: 'Nodes'}, type: Node})
    public progressBarIndicatorNode: Node;
    @property({group: {name: 'Nodes'}, type: Node})
    public scoreNode: Node;
    @property({group: {name: 'Nodes'}, type: Node})
    public movesNode: Node;
    @property({group: {name: 'Nodes'}, type: Node})
    public fieldNode: Node;
    @property({group: {name: 'Nodes'}, type: Node})
    public fieldSpawnNode: Node;
    @property({group: {name: 'Nodes'}, type: Node})
    public bonusBombButtonNode: Node;
    @property({group: {name: 'Nodes'}, type: Node})
    public bonusTeleportButtonNode: Node;

    private _tileRatio: number = TILE_RATIO;
    public tileHeight: number;
    public tileWidth: number;

    public initButtonHandlers(
        onBonusButtonClick: (bonus: Bonus) => void
    ) {
        this.bonusBombButtonNode.on(Node.EventType.MOUSE_DOWN, () => {
            onBonusButtonClick(Bonus.Bomb);
        });
        this.bonusTeleportButtonNode.on(Node.EventType.MOUSE_DOWN, () => {
            onBonusButtonClick(Bonus.Teleport);
        });
    }

    public restoreTileColor(tile: Node) {
        tile.getComponent(SpriteComponent).color = COLOR_DEFAULT;
    }

    public makeTileDarker(tile: Node) {
        tile.getComponent(SpriteComponent).color = COLOR_DARK_TILE;
    }

    public updateGameInfo(remainMoves: number, currentScore: number, progress: number) {
        this.movesNode.getComponent(LabelComponent).string = remainMoves.toString();
        this.scoreNode.getComponent(LabelComponent).string = currentScore.toString();
        this.progressBarIndicatorNode.getComponent(ProgressBarComponent).progress = progress;
    }

    public updateBonusButtonsUI(gameState: GameState, activeBonus: Bonus) {
        const isBonusApplying = gameState === GameState.BonusApplying;
        if (isBonusApplying) {
            const isBombBonusActive = activeBonus === Bonus.Bomb;
            if (isBombBonusActive) {
                this.bonusBombButtonNode.getComponent(SpriteComponent).color = COLOR_ACTIVE_BUTTON;
                this.bonusTeleportButtonNode.getComponent(SpriteComponent).color = COLOR_DEFAULT;
                return;
            }

            const isTeleportBonusActive = activeBonus === Bonus.Teleport;
            if (isTeleportBonusActive) {
                this.bonusTeleportButtonNode.getComponent(SpriteComponent).color = COLOR_ACTIVE_BUTTON;
                this.bonusBombButtonNode.getComponent(SpriteComponent).color = COLOR_DEFAULT;
                return
            }
            return;
        }
        this.bonusBombButtonNode.getComponent(SpriteComponent).color = COLOR_DEFAULT;
        this.bonusTeleportButtonNode.getComponent(SpriteComponent).color = COLOR_DEFAULT;
    }

    public calculateTileDimensions(rows: number, columns: number) {
        const {width, height} = this.fieldSpawnNode.getComponent(UITransformComponent).contentSize;
        const fieldTransform = this.fieldNode.getComponent(UITransformComponent).contentSize;
        const {x, y} = this.fieldSpawnNode.getPosition();
        if (columns >= rows) {
            this.tileWidth = width / columns;
            this.tileHeight = this.tileWidth * this._tileRatio;
            fieldTransform.set(fieldTransform.width, Math.abs(y) * 2 + this.tileHeight * rows);
        } else {
            this.tileHeight = height / rows;
            this.tileWidth = this.tileHeight / this._tileRatio;
            fieldTransform.set(Math.abs(x) * 2 + this.tileWidth * columns, fieldTransform.height);
        }
    }

    public calculateX(column: number) {
        return column * this.tileWidth + this.tileWidth / 2
    }
    public calculateY(row: number) {
        return -row * this.tileHeight - this.tileHeight / 2;
    }

    public updateCellsPosition(tiles: Node[][]) {
        for (let row = 0; row < tiles.length; row++) {
            for(let column = 0; column < tiles[0].length; column++) {
                tween(tiles[row][column])
                    .to(0.25, {position: new Vec3(
                        this.calculateX(column),
                        this.calculateY(row),
                        0
                    )})
                    .start();
            }
        }
    }
}
