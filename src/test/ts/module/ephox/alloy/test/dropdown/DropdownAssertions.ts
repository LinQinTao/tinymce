import { Assertions, Chain, Logger, UiFinder } from '@ephox/agar';
import { Css, Width } from '@ephox/sugar';

const sSameWidth = function (label, gui, dropdown, menuSelector) {
  return Logger.t(
    label + '\nChecking that the hotspot width is passed onto the menu width',
    Chain.asStep(gui.element(), [
      UiFinder.cFindIn(menuSelector),
      Chain.op(function (menu) {
        const dropdownWidth = Width.get(dropdown.element());
        const menuWidth = parseInt(
          Css.getRaw(menu, 'width').getOrDie('Menu must have a width property'),
          10
        );

        Assertions.assertEq(
          'Check that the menu width is approximately the same as the hotspot width',
          true,
          Math.abs(menuWidth - dropdownWidth) < 20
        );
      })
    ])
  );
};

export default <any> {
  sSameWidth
};