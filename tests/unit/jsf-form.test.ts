import { describe, expect, it } from 'vitest';
import {
  buildFormRequest,
  buildLinkRequest,
  collectFields,
  parseJsfLink,
  setField
} from '../../src/jsf/form.js';
import { Page } from '../../src/page.js';
import { coursesPage } from '../fixtures/pages.js';

const page = (html: string) =>
  new Page(new URL('https://sig.example.org/sigaa/a/b.jsf'), 200, html);

describe('parseJsfLink', () => {
  it('lê o formato clássico', () => {
    const link = parseJsfLink(
      "if(typeof jsfcljs == 'function'){jsfcljs(document.getElementById('f1'),{'a:b':'a:b','id':'7'},'');}return false"
    );
    expect(link).toEqual({ formId: 'f1', params: { 'a:b': 'a:b', id: '7' }, target: '' });
  });

  it('lê o formato com funções antes do if (UFSJ) e alvo _blank', () => {
    const link = parseJsfLink(
      "var a=function(){return x();};var b=function(){if(typeof jsfcljs == 'function'){jsfcljs(document.getElementById('f2'),{'k':'v','p':'/portais/x.jsp'},'_blank');}return false};return (a()==false) ? false : b();"
    );
    expect(link).toEqual({
      formId: 'f2',
      params: { k: 'v', p: '/portais/x.jsp' },
      target: '_blank'
    });
  });

  it('desfaz escapes de aspas e barras', () => {
    const link = parseJsfLink(
      String.raw`jsfcljs(document.getElementById('f'),{'k':'it\'s','b':'a\\b'},'')`
    );
    expect(link?.params).toEqual({ k: "it's", b: 'a\\b' });
  });

  it('trata chaves como __proto__ como dados comuns (sem alterar o objeto)', () => {
    const link = parseJsfLink(
      "jsfcljs(document.getElementById('f'),{'__proto__':'x','constructor':'y','a':'b'},'')"
    );
    expect(Object.keys(link?.params ?? {})).toEqual(['__proto__', 'constructor', 'a']);
    expect(link?.params['__proto__']).toBe('x');
    expect(Object.getPrototypeOf(link?.params)).toBeNull();
  });

  it('retorna undefined sem chamada jsfcljs', () => {
    expect(parseJsfLink('return false')).toBeUndefined();
    expect(parseJsfLink(undefined)).toBeUndefined();
  });
});

describe('collectFields', () => {
  it('envia só controles bem-sucedidos', () => {
    const p =
      page(`<form id="f"><input name="a" value="1"/><input type="hidden" name="b" value="2"/>
      <input type="submit" name="s" value="x"/><input type="image" name="i"/><input type="button" name="btn"/>
      <input type="checkbox" name="c1" value="on"/><input type="checkbox" name="c2" value="on" checked/>
      <input type="radio" name="r" value="1"/><input type="radio" name="r" value="2" checked/>
      <input name="off" value="x" disabled/><input value="sem-nome"/>
      <select name="sel"><option value="x">X</option><option value="y" selected>Y</option></select>
      <select name="sel2"><option value="p">P</option></select>
      <textarea name="t">texto</textarea></form>`);
    expect(collectFields(p.$('#f'))).toEqual([
      ['a', '1'],
      ['b', '2'],
      ['c2', 'on'],
      ['r', '2'],
      ['sel', 'y'],
      ['sel2', 'p'],
      ['t', 'texto']
    ]);
  });

  it('setField substitui ou acrescenta', () => {
    const fields: [string, string][] = [['a', '1']];
    setField(fields, 'a', '2');
    setField(fields, 'b', '3');
    expect(fields).toEqual([
      ['a', '2'],
      ['b', '3']
    ]);
  });
});

describe('buildFormRequest / buildLinkRequest', () => {
  it('resolve a action relativa e mescla os parâmetros do link', () => {
    const p = page(coursesPage());
    const link = parseJsfLink(p.$('a[onclick]').first().attr('onclick'));
    const request = buildLinkRequest(p, link!);
    expect(request.action.href).toBe('https://sig.example.org/sigaa/portais/discente/turmas.jsf');
    expect(Object.fromEntries(request.fields)).toMatchObject({
      formCursos: 'formCursos',
      'javax.faces.ViewState': 'j_id2',
      frontEndIdTurma: 'T-AAA0001'
    });
  });

  it('falha de forma tipada quando o formulário não existe', () => {
    expect(() => buildFormRequest(page('<p/>'), 'form#nada')).toThrow(
      expect.objectContaining({ code: 'UNEXPECTED_PAGE' }) as Error
    );
  });
});
