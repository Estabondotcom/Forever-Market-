import {createElement} from 'react';
import {act,create,type ReactTestRenderer,type ReactTestInstance} from 'react-test-renderer';
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
vi.mock('../src/components/ComparisonChart',()=>({default:()=>null}));
import Dashboard from '../src/components/Dashboard';
(globalThis as typeof globalThis&{IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
let renderer:ReactTestRenderer|undefined;
function tab(root:ReactTestInstance,label:string){return root.findByProps({'aria-label':'Resource sections'}).findAllByType('button').find(button=>button.children.includes(label))!;}
async function add(root:ReactTestInstance,query:string,id:number){await act(async()=>root.findByProps({role:'combobox'}).props.onChange({target:{value:query}}));await act(async()=>root.findAllByProps({role:'option'}).find(option=>String(option.props.id).endsWith(`-${id}`))!.props.onClick());}
beforeEach(()=>{vi.stubGlobal('window',{addEventListener:vi.fn(),removeEventListener:vi.fn()});vi.stubGlobal('localStorage',{getItem:vi.fn(()=>null),setItem:vi.fn()});vi.stubGlobal('fetch',vi.fn());const original=console.error;vi.spyOn(console,'error').mockImplementation((...args)=>{if(!String(args[0]).includes('react-test-renderer is deprecated'))original(...args);});});
afterEach(async()=>{if(renderer)await act(async()=>renderer!.unmount());renderer=undefined;vi.restoreAllMocks();vi.unstubAllGlobals();});
it('starts Search empty, adds chosen items for comparison and retains the temporary list across tab switches',async()=>{
 await act(async()=>{renderer=create(createElement(Dashboard,{demoOnly:true}));});await act(async()=>tab(renderer!.root,'Search').props.onClick());
 expect(renderer!.root.findAllByProps({role:'option'})).toHaveLength(0);expect(renderer!.root.findAllByProps({role:'switch'})).toHaveLength(0);
 await add(renderer!.root,'major mana',13444);await add(renderer!.root,'mongoose',13452);
 expect(renderer!.root.findByProps({'aria-label':'Compare Major Mana Potion price'}).props['aria-checked']).toBe(true);expect(renderer!.root.findAllByProps({role:'switch'})).toHaveLength(4);
 await act(async()=>tab(renderer!.root,'Fish').props.onClick());expect(renderer!.root.findAllByProps({role:'switch'}).every(toggle=>!toggle.props['aria-checked'])).toBe(true);
 await act(async()=>tab(renderer!.root,'Search').props.onClick());expect(renderer!.root.findAllByProps({role:'switch'})).toHaveLength(4);
 await act(async()=>renderer!.root.findByProps({'aria-label':'Remove Major Mana Potion from search list'}).props.onClick());expect(renderer!.root.findAllByProps({role:'switch'})).toHaveLength(2);
 await act(async()=>renderer!.root.findAllByType('button').find(button=>button.children.includes('Clear list'))!.props.onClick());expect(renderer!.root.findAllByProps({role:'switch'})).toHaveLength(0);expect(fetch).not.toHaveBeenCalled();
});
it('keeps different visitors independent and clears the list on a new page/reload',async()=>{
 await act(async()=>{renderer=create(createElement(Dashboard,{demoOnly:true}));});await act(async()=>tab(renderer!.root,'Search').props.onClick());await add(renderer!.root,'major mana',13444);
 let other!:ReactTestRenderer;try{await act(async()=>{other=create(createElement(Dashboard,{demoOnly:true}));});await act(async()=>tab(other.root,'Search').props.onClick());expect(other.root.findAllByProps({role:'switch'})).toHaveLength(0);expect(renderer!.root.findAllByProps({role:'switch'})).toHaveLength(2);}finally{await act(async()=>other.unmount());}
 await act(async()=>renderer!.unmount());await act(async()=>{renderer=create(createElement(Dashboard,{demoOnly:true}));});await act(async()=>tab(renderer!.root,'Search').props.onClick());expect(renderer!.root.findAllByProps({role:'switch'})).toHaveLength(0);expect(localStorage.setItem).not.toHaveBeenCalled();
});
it('supports keyboard selection and Escape in autocomplete',async()=>{
 await act(async()=>{renderer=create(createElement(Dashboard,{demoOnly:true}));});await act(async()=>tab(renderer!.root,'Search').props.onClick());
 await act(async()=>renderer!.root.findByProps({role:'combobox'}).props.onChange({target:{value:'13444'}}));
 expect(renderer!.root.findByProps({role:'combobox'}).props['aria-expanded']).toBe(true);
 await act(async()=>renderer!.root.findByProps({role:'combobox'}).props.onKeyDown({key:'Escape',preventDefault:vi.fn()}));expect(renderer!.root.findAllByProps({role:'option'})).toHaveLength(0);
 await act(async()=>renderer!.root.findByProps({role:'combobox'}).props.onFocus());await act(async()=>renderer!.root.findByProps({role:'combobox'}).props.onKeyDown({key:'Enter',preventDefault:vi.fn()}));expect(renderer!.root.findByProps({'aria-label':'Compare Major Mana Potion demand'}).props['aria-checked']).toBe(true);
});
