import {
  AddEventsBehaviour,
  AlloyComponent,
  AlloyEvents,
  AlloyTriggers,
  Behaviour,
  EventFormat,
  FormField as AlloyFormField,
  Keying,
  NativeEvents,
  Replacing,
  Representing,
  SimulatedEvent,
  SketchSpec,
  SugarEvent,
  Tabstopping,
} from '@ephox/alloy';
import { Types } from '@ephox/bridge';
import { Arr, Fun } from '@ephox/katamari';

import { Attr, Element, Focus, Html, SelectorFind, Class } from '@ephox/sugar';
import { renderFormFieldWith, renderLabel } from 'tinymce/themes/silver/ui/alien/FieldLabeller';

import { detectSize } from '../alien/FlatgridAutodetect';
import { formActionEvent, formResizeEvent } from '../general/FormEvents';
import { deriveCollectionMovement } from '../menus/menu/MenuMovement';
import * as ItemClasses from '../menus/item/ItemClasses';
import { UiFactoryBackstageProviders } from '../../backstage/Backstage';

export const renderCollection = (spec: Types.Collection.Collection, providersBackstage: UiFactoryBackstageProviders): SketchSpec => {
  // DUPE with TextField.
  const pLabel = spec.label.map((label) => renderLabel(label, providersBackstage));

  const runOnItem = (f: (c: AlloyComponent, tgt: Element, itemValue: string) => void) => <T extends EventFormat>(comp: AlloyComponent, se: SimulatedEvent<T>) => {
    SelectorFind.closest(se.event().target(), '[data-collection-item-value]').each((target) => {
      f(comp, target, Attr.get(target, 'data-collection-item-value'));
    });
  };

  const escapeAttribute = (ch) => {
    if (ch === '"') { return '&quot;'; }
    return ch;
  };

  const setContents = (comp, items) => {
    const htmlLines = Arr.map(items, (item) => {
      const textContent = spec.columns === 1 ? item.text.map((text) => {
        return `<span class="tox-collection__item-label">${text}</span>`;
      }).getOr('') : '';

      const iconContent = item.icon.map((icon) => {
        return `<span class="tox-collection__item-icon">${icon}</span>`;
      }).getOr('');

      return `<div class="tox-collection__item" tabindex="-1" data-collection-item-value="${escapeAttribute(item.value)}">${iconContent}${textContent}</div>`;
    });

    const chunks = spec.columns > 1 && spec.columns !== 'auto' ? Arr.chunk(htmlLines, spec.columns) : [ htmlLines ];
    const html = Arr.map(chunks, (ch) => {
      return `<div class="tox-collection__group">${ch.join('')}</div>`;
    });

    Html.set(comp.element(), html.join(''));
  };

  const collectionEvents = [
    AlloyEvents.run<SugarEvent>(NativeEvents.mouseover(), runOnItem((comp, tgt) => {
      Focus.focus(tgt);
    })),
    AlloyEvents.run<SugarEvent>(NativeEvents.click(), runOnItem((comp, tgt, itemValue) => {
      AlloyTriggers.emitWith(comp, formActionEvent, {
        name: spec.name,
        value: itemValue
      });
    })),
    AlloyEvents.run(NativeEvents.focusin(), runOnItem((comp, tgt, itemValue) => {
      SelectorFind.descendant(comp.element(), '.' + ItemClasses.activeClass).each((currentActive) => {
        Class.remove(currentActive, ItemClasses.activeClass);
      });
      Class.add(tgt, ItemClasses.activeClass);
    })),
    AlloyEvents.run(NativeEvents.focusout(), runOnItem((comp, tgt, itemValue) => {
      SelectorFind.descendant(comp.element(), '.' + ItemClasses.activeClass).each((currentActive) => {
        Class.remove(currentActive, ItemClasses.activeClass);
      });
    })),
    AlloyEvents.runOnExecute(runOnItem((comp, tgt, itemValue) => {
      AlloyTriggers.emitWith(comp, formActionEvent, {
        name: spec.name,
        value: itemValue
      });
    }))
  ];

  const pField = AlloyFormField.parts().field({
    dom: {
      tag: 'div',
      // FIX: Read from columns
      classes: [ 'tox-collection' ].concat(spec.columns !== 1 ? [ 'tox-collection--grid' ] : [ 'tox-collection--list' ])
    },
    components: [ ],
    factory: { sketch: Fun.identity },
    behaviours: Behaviour.derive([
      Replacing.config({ }),
      Representing.config({
        store: {
          mode: 'memory',
          initialValue: [ ]
        },
        onSetValue: (comp, items) => {
          setContents(comp, items);
          if (spec.columns === 'auto') {
            detectSize(comp, 5, 'tox-collection__item').each(({ numRows, numColumns }) => {
              Keying.setGridSize(comp, numRows, numColumns);
            });
          }

          AlloyTriggers.emit(comp, formResizeEvent);
        }
      }),
      Tabstopping.config({ }),
      Keying.config(
        deriveCollectionMovement(spec.columns, 'normal')
      ),
      AddEventsBehaviour.config('collection-events', collectionEvents)
    ])
  });

  const extraClasses = ['tox-form__group--collection'];

  return renderFormFieldWith(pLabel, pField, extraClasses);
};