-- Fixtures sintéticos exclusivos da base cecchin_http_test_*.
do $$ begin
 if current_database() !~ '^cecchin_http_test_[0-9]+$' then raise exception 'Banco não descartável'; end if;
end $$;
insert into organizacao(slug,nome) values('cecchin-http-teste','Cecchin HTTP Teste');
insert into configuracao_notificacao(organizacao_id,email_habilitado,whatsapp_habilitado)
 values(app.org_padrao(),false,false);
insert into modelo_rodizio(organizacao_id,slug,nome) values(app.org_padrao(),'rodizio-teste','Rodízio de teste');
insert into modelo_forno(organizacao_id,slug,nome) values(app.org_padrao(),'forno-teste','Forno de teste');
insert into cliente(organizacao_id,nome,contato_bruto) values(app.org_padrao(),'Cliente sintético','Fixture HTTP');
insert into evento(organizacao_id,cliente_id,data_evento,horario,inteiros,meios,valor_por_pessoa,endereco)
 select app.org_padrao(),id,current_date+30,'20:00',20,0,50,'Rua Sintética, 100' from cliente limit 1;
