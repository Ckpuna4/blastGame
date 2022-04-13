
import {
    _decorator,
    Component,
    Node,
    instantiate,
    UITransformComponent,
    SpriteComponent,
    SpriteFrame,
    Prefab
} from 'cc';
import { TileColor } from './enums/TileColor.enum';
import { TileController } from './TileController';
import { TileProps } from './types/TileProps.type';
const { ccclass, property } = _decorator;

@ccclass('TileFactory')
export class TileFactory extends Component {
    @property({type: Prefab})
    public TilePrefab: Prefab;

    @property({group: {name: 'TileColorSprites'}, type: SpriteFrame})
    public blue: SpriteFrame;
    @property({group: {name: 'TileColorSprites'}, type: SpriteFrame})
    public purple: SpriteFrame;
    @property({group: {name: 'TileColorSprites'}, type: SpriteFrame})
    public red: SpriteFrame;
    @property({group: {name: 'TileColorSprites'}, type: SpriteFrame})
    public yellow: SpriteFrame;
    @property({group: {name: 'TileColorSprites'}, type: SpriteFrame})
    public green: SpriteFrame;

    createTile({width, height, color, x, y, row, column}: TileProps): Node {
        const tile = instantiate(this.TilePrefab);
        tile.setPosition(x, y, 0);
        tile.getChildByName('Tile');
        const transform = tile.getComponent(UITransformComponent);
        transform.setContentSize(width, height);
        
        const sprite = tile.getComponent(SpriteComponent);
        sprite.spriteFrame = this._getColorSprite(color);

        const tileController = tile.getComponent(TileController);
        tileController.color = color;
        tileController.row = row;
        tileController.column = column;

        return tile;
    }

    private _getColorSprite(color: TileColor): SpriteFrame {
        switch (color) {
            case TileColor.Blue:
                return this.blue;
            case TileColor.Purple:
                return this.purple;
            case TileColor.Red:
                return this.red;
            case TileColor.Yellow:
                return this.yellow;
            case TileColor.Green:
                return this.green;
            default:
                return this.blue;
        }
    }
}
