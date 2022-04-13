
import { _decorator, Component, tween, color, UIOpacityComponent, AnimationComponent } from 'cc';
import { TileColor } from './enums/TileColor.enum';
const { ccclass } = _decorator;

@ccclass('TileController')
export class TileController extends Component {
    public color: TileColor;
    public row: number;
    public column: number;

    start() {
        const opacityComponent = this.node.getComponent(UIOpacityComponent);
        opacityComponent.opacity = 0;
        tween(opacityComponent)
            .delay(0.25)
            .to(0.5, {opacity: 255})
            .start();
    }

    destroyTile() {
        const animation = this.node.getComponent(AnimationComponent);
        animation.play();
    }

    onBlastEnd() {
        this.node.destroy();
    }
}
